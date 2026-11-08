import { useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download, FileSpreadsheet, FileUp, Upload } from 'lucide-react';
import type { AppData, Commitment, Course, Task } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import {
  countAppData,
  mergeAppData,
  parseImport,
} from '@/lib/storage/storage';
import { downloadTextFile } from '@/lib/download';
import {
  commitmentsFromCsv,
  commitmentsTemplateCsv,
  commitmentsToCsv,
  coursesFromCsv,
  coursesTemplateCsv,
  coursesToCsv,
  dataFilename,
  parseCsv,
  tasksFromCsv,
  tasksTemplateCsv,
  tasksToCsv,
  type CsvEntity,
} from '@/lib/io/csv';

type ImportMode = 'merge' | 'replace';

interface JsonPending {
  data: AppData;
  errors: string[];
}

interface CsvPending {
  kind: CsvEntity;
  courses?: Course[];
  tasks?: Task[];
  commitments?: Commitment[];
  errors: string[];
  valid: number;
}

const ENTITY_LABEL: Record<CsvEntity, string> = {
  courses: 'settings.data.csv.courses',
  tasks: 'settings.data.csv.tasks',
  commitments: 'settings.data.csv.commitments',
};

const ENTITY_COLUMNS: Record<CsvEntity, string> = {
  courses: 'settings.data.csv.coursesColumns',
  tasks: 'settings.data.csv.tasksColumns',
  commitments: 'settings.data.csv.commitmentsColumns',
};

export function DataManager() {
  const { t } = useTranslation();
  const { data, replaceData, buildExport } = useApp();
  const { notify } = useToast();

  const [jsonPending, setJsonPending] = useState<JsonPending | null>(null);
  const [jsonMode, setJsonMode] = useState<ImportMode>('merge');
  const [csvPending, setCsvPending] = useState<CsvPending | null>(null);

  const jsonPreview = useMemo(() => {
    if (!jsonPending) return null;
    return {
      counts: countAppData(jsonPending.data),
      merge: mergeAppData(data, jsonPending.data),
    };
  }, [jsonPending, data]);

  const handleJsonExport = () => {
    downloadTextFile(dataFilename('data', 'json'), buildExport());
    notify({ title: t('settings.data.exported') });
  };

  const handleJsonFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify({ title: t('settings.data.sizeError'), tone: 'error' });
      return;
    }
    const result = parseImport(await file.text());
    if (!result.data) {
      notify({
        title: t('settings.data.invalidFile'),
        description: result.errors[0],
        tone: 'error',
      });
      return;
    }
    setJsonMode('merge');
    setJsonPending({ data: result.data, errors: result.errors });
  };

  const confirmJson = () => {
    if (!jsonPending || !jsonPreview) return;
    if (jsonMode === 'replace') {
      replaceData(jsonPending.data);
      notify({ title: t('settings.data.imported') });
    } else {
      replaceData(jsonPreview.merge.data);
      const skipped = jsonPreview.merge.summary.skipped;
      notify({
        title:
          skipped > 0
            ? t('settings.data.mergedWithSkips', { count: skipped })
            : t('settings.data.merged'),
      });
    }
    setJsonPending(null);
  };

  const exportCsv = (kind: CsvEntity) => {
    if (kind === 'courses') {
      downloadTextFile(dataFilename('courses', 'csv'), coursesToCsv(data.courses), 'text/csv');
    } else if (kind === 'tasks') {
      downloadTextFile(
        dataFilename('assignments', 'csv'),
        tasksToCsv(data.tasks, data.courses),
        'text/csv',
      );
    } else {
      downloadTextFile(
        dataFilename('commitments', 'csv'),
        commitmentsToCsv(data.commitments),
        'text/csv',
      );
    }
    notify({ title: t('settings.data.exported') });
  };

  const downloadTemplate = (kind: CsvEntity) => {
    const content =
      kind === 'courses'
        ? coursesTemplateCsv()
        : kind === 'tasks'
          ? tasksTemplateCsv()
          : commitmentsTemplateCsv();
    downloadTextFile(dataFilename(`${kind}-template`, 'csv'), content, 'text/csv');
  };

  const openCsvPicker = (kind: CsvEntity) => {
    document.getElementById(`csv-import-${kind}`)?.click();
  };

  const handleCsvFile = async (kind: CsvEntity, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    if (!text.trim()) {
      notify({ title: t('settings.data.csv.emptyFile'), tone: 'error' });
      return;
    }
    try {
      parseCsv(text);
    } catch {
      notify({ title: t('settings.data.csv.unknownFile'), tone: 'error' });
      return;
    }

    if (kind === 'courses') {
      const result = coursesFromCsv(text, data.courses);
      setCsvPending({
        kind,
        courses: result.items,
        errors: result.errors,
        valid: result.items.length,
      });
    } else if (kind === 'tasks') {
      const result = tasksFromCsv(text, data.courses);
      setCsvPending({
        kind,
        tasks: result.items,
        errors: result.errors,
        valid: result.items.length,
      });
    } else {
      const result = commitmentsFromCsv(text);
      setCsvPending({
        kind,
        commitments: result.items,
        errors: result.errors,
        valid: result.items.length,
      });
    }
  };

  const confirmCsv = () => {
    if (!csvPending) return;
    const next: AppData = {
      ...data,
      courses: [...data.courses, ...(csvPending.courses ?? [])],
      tasks: [...data.tasks, ...(csvPending.tasks ?? [])],
      commitments: [...data.commitments, ...(csvPending.commitments ?? [])],
    };
    replaceData(next);
    notify({
      title:
        csvPending.errors.length > 0
          ? t('settings.data.csv.importedWithErrors', {
              imported: csvPending.valid,
              skipped: csvPending.errors.length,
            })
          : t('settings.data.csv.imported', { count: csvPending.valid }),
    });
    setCsvPending(null);
  };

  const csvRows: CsvEntity[] = ['courses', 'tasks', 'commitments'];

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-foreground">{t('settings.data.export')}</p>
          <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
            {t('settings.data.exportHint')}
          </p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={handleJsonExport}>
            <Download aria-hidden="true" />
            {t('common.download')}
          </Button>
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-foreground">{t('settings.data.import')}</p>
          <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
            {t('settings.data.importHint')}
          </p>
          <input
            id="json-import"
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={handleJsonFile}
            aria-label={t('settings.data.import')}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => document.getElementById('json-import')?.click()}
          >
            <Upload aria-hidden="true" />
            {t('common.upload')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border p-3">
        <p className="flex items-center gap-2 text-xs font-medium text-foreground">
          <FileSpreadsheet aria-hidden="true" className="size-3.5 text-muted-foreground" />
          {t('settings.data.csv.title')}
        </p>
        <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
          {t('settings.data.csv.subtitle')}
        </p>

        <ul className="mt-3 flex flex-col divide-y divide-border">
          {csvRows.map((kind) => (
            <li key={kind} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">
                  {t(ENTITY_LABEL[kind])}
                </span>
                <div className="flex flex-wrap gap-1">
                  <input
                    id={`csv-import-${kind}`}
                    type="file"
                    accept="text/csv,.csv"
                    className="sr-only"
                    onChange={(event) => handleCsvFile(kind, event)}
                    aria-label={t('settings.data.csv.import')}
                  />
                  <Button variant="ghost" size="sm" onClick={() => exportCsv(kind)}>
                    <Download aria-hidden="true" />
                    {t('settings.data.csv.export')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadTemplate(kind)}>
                    {t('settings.data.csv.template')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openCsvPicker(kind)}>
                    <FileUp aria-hidden="true" />
                    {t('settings.data.csv.import')}
                  </Button>
                </div>
              </div>
              <p className="text-2xs leading-relaxed text-muted-foreground">
                <span className="font-medium">{t('settings.data.csv.columnsTitle')}:</span>{' '}
                {t(ENTITY_COLUMNS[kind])}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
          {t('settings.data.csv.timeFormat')}
        </p>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-foreground">{t('settings.data.ics.title')}</p>
        <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
          {t('settings.data.ics.body')}
        </p>
      </div>

      <Dialog
        open={Boolean(jsonPending)}
        onOpenChange={(open) => {
          if (!open) setJsonPending(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('settings.data.previewTitle')}</DialogTitle>
            <DialogDescription>
              {t('settings.data.previewBody', {
                courses: jsonPreview?.counts.courses ?? 0,
                tasks: jsonPreview?.counts.tasks ?? 0,
                commitments: jsonPreview?.counts.commitments ?? 0,
                usage: jsonPreview?.counts.usage ?? 0,
                skipped: jsonPreview?.merge.summary.skipped ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>

          <div role="radiogroup" aria-label={t('settings.data.previewTitle')} className="flex flex-col gap-2">
            {(['merge', 'replace'] as ImportMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={jsonMode === mode}
                onClick={() => setJsonMode(mode)}
                className={
                  jsonMode === mode
                    ? 'rounded-md border border-primary/40 bg-primary-soft/50 px-3 py-2 text-left'
                    : 'rounded-md border border-border px-3 py-2 text-left hover:bg-muted'
                }
              >
                <span className="block text-xs font-medium text-foreground">
                  {mode === 'merge' ? t('settings.data.merge') : t('settings.data.replace')}
                </span>
                <span className="mt-0.5 block text-2xs leading-relaxed text-muted-foreground">
                  {mode === 'merge' ? t('settings.data.mergeHint') : t('settings.data.replaceHint')}
                </span>
              </button>
            ))}
          </div>

          {jsonMode === 'replace' ? (
            <p className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-2xs leading-relaxed text-warning">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {t('settings.data.replaceWarning')}
            </p>
          ) : null}

          {jsonPending && jsonPending.errors.length > 0 ? (
            <ul className="max-h-32 overflow-y-auto rounded-md border border-warning/30 bg-warning/5 p-2 text-2xs text-warning">
              {jsonPending.errors.slice(0, 8).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setJsonPending(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={jsonMode === 'replace' ? 'destructive' : 'primary'}
              onClick={confirmJson}
            >
              {jsonMode === 'merge'
                ? t('settings.data.confirmMerge')
                : t('settings.data.confirmReplace')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(csvPending)}
        onOpenChange={(open) => {
          if (!open) setCsvPending(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('settings.data.csv.previewTitle', {
                entity: csvPending ? t(ENTITY_LABEL[csvPending.kind]) : '',
              })}
            </DialogTitle>
            <DialogDescription>
              {t('settings.data.csv.previewBody', {
                valid: csvPending?.valid ?? 0,
                invalid: csvPending?.errors.length ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>

          {csvPending && csvPending.errors.length > 0 ? (
            <div>
              <p className="mb-1 text-2xs font-medium text-foreground">
                {t('settings.data.csv.errorsTitle')}
              </p>
              <ul className="max-h-40 overflow-y-auto rounded-md border border-warning/30 bg-warning/5 p-2 text-2xs text-warning">
                {csvPending.errors.slice(0, 12).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setCsvPending(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmCsv} disabled={(csvPending?.valid ?? 0) === 0}>
              {t('settings.data.csv.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

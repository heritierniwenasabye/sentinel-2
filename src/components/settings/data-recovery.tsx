import { importDiagnostic } from '@/lib/io/diagnostic';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/hooks/use-app';
import { readRecoveryBackup, readRecoveryArchive, parseImport, mergeAppData, exportAppData, type ImportResult } from '@/lib/storage/storage';
import { downloadTextFile } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/confirm-dialog';

export function DataRecovery() {
  const { t } = useTranslation();
  const { data, replaceData } = useApp();
  const [archive] = useState(readRecoveryArchive);
  const [raw] = useState(readRecoveryBackup);
  const [downloaded, setDownloaded] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!raw) return null;
  return <section aria-labelledby="recovery-title" className="rounded-md border border-warning/40 p-3">
    <h3 id="recovery-title" className="text-sm font-semibold">{t('recovery.title')}</h3><p className="mt-1 text-xs text-muted-foreground">{t('recovery.body')}</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => { downloadTextFile('sentinel-recovery-raw.txt', raw, 'text/plain'); setDownloaded(true); }}>{t('recovery.download')}</Button>
      {archive && archive !== raw ? <Button size="sm" variant="secondary" onClick={() => downloadTextFile('sentinel-recovery-previous.txt', archive, 'text/plain')}>{t('recovery.previous')}</Button> : null}
      <Button size="sm" variant="secondary" onClick={() => setResult(parseImport(raw))}>{t('recovery.validate')}</Button>
      <Button size="sm" disabled={!downloaded || !result?.data} onClick={() => setConfirm(true)}>{t('recovery.restore')}</Button></div>
    {result && <div role="status" className="mt-2 text-xs">{!result.data ? t('recovery.invalid') : t('settings.data.previewBody', { ...{ courses: result.data.courses.length, tasks: result.data.tasks.length, commitments: result.data.commitments.length, usage: result.data.usage.length }, skipped: result.errors.length })}<ul>{result.errors.slice(0, 20).map((e,i) => <li key={i}>{importDiagnostic(e, t)}</li>)}</ul></div>}
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={t('recovery.confirmTitle')} description={t('recovery.confirmBody')} confirmLabel={t('recovery.restore')} onConfirm={() => {
      if (!result?.data) return;
      // A separate current-workspace export makes the merge reviewable and reversible.
      downloadTextFile('sentinel-before-recovery.json', exportAppData(data));
      replaceData(mergeAppData(data, result.data).data);
    }}/>
  </section>;
}

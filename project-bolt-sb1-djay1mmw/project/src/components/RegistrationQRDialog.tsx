import { useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Link2, QrCode, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type QrEntityType = 'student' | 'recruiter' | 'job';

type Props = {
  entityType: QrEntityType;
  onClose: () => void;
};

export default function RegistrationQRDialog({ entityType, onClose }: Props) {
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generateRegistrationQr() {
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('create_registration_qr', { p_entity_type: entityType });
      if (rpcError) {
        setError(`QR link nahi ban saka: ${rpcError.message}. Supabase migration apply hui hai, check karein.`);
        return;
      }
      if (typeof data !== 'string' || !data) {
        throw new Error('Supabase se valid registration token nahi mila.');
      }

      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('register', data);
      const image = await QRCode.toDataURL(url.toString(), { width: 280, margin: 2, errorCorrectionLevel: 'M' });
      setRegistrationUrl(url.toString());
      setQrImage(image);
    } catch (qrError) {
      setError(qrError instanceof Error ? `QR create nahi hua: ${qrError.message}` : 'QR create nahi hua.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Link copy nahi hua. Browser clipboard permission check karein.');
    }
  }

  async function revokeAndClose() {
    try {
      if (registrationUrl) {
        const token = new URL(registrationUrl).searchParams.get('register');
        if (token) {
          const { error: revokeError } = await supabase.rpc('revoke_registration_qr', { p_token: token });
          if (revokeError) {
            setError(`QR revoke nahi hua: ${revokeError.message}`);
            return;
          }
        }
      }
      onClose();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? `QR revoke nahi hua: ${revokeError.message}` : 'QR revoke nahi hua.');
    }
  }

  const title = entityType === 'student'
    ? 'Student QR registration'
    : entityType === 'job' ? 'Job post QR' : 'Recruiter QR registration';
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-3 sm:p-6" onClick={onClose}>
      <div className="mx-auto my-4 w-full max-w-xl overflow-hidden rounded-2xl border border-yellow-400/20 bg-zinc-950" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close QR dialog" className="rounded-lg p-2 text-gray-400 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-gray-400">
            {entityType === 'job'
              ? 'Recruiter company aur job details QR form se submit kare. Company aur job dono placement system mein add ho jayenge.'
              : `QR scan karke ${entityType === 'student' ? 'students' : 'recruiters'} apni details khud submit kar sakte hain. Submit hote hi record add hoga.`}
          </p>
          {!qrImage ? (
            <button type="button" onClick={generateRegistrationQr} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black disabled:opacity-50">
              <QrCode className="h-5 w-5" /> {loading ? 'QR bana rahe hain...' : 'Generate registration QR'}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <img src={qrImage} alt={`${title} code`} className="h-64 w-64 rounded-xl bg-white p-2" />
              <div className="flex w-full flex-wrap justify-center gap-2">
                <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"><Copy className="h-4 w-4" />{copied ? 'Copied' : 'Copy form link'}</button>
                <a href={qrImage} download={`${entityType}-registration-qr.png`} className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"><Download className="h-4 w-4" />Download QR</a>
                <a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"><Link2 className="h-4 w-4" />Open form</a>
              </div>
              <button type="button" onClick={revokeAndClose} className="text-sm text-red-400 hover:underline">Revoke QR and close</button>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

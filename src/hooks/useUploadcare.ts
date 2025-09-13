import { useCallback } from "react";

export default function useUploadcare(uploadcareKey?: string) {
  // Wait for uploadcare widget to load
  const waitForUploadcare = useCallback(async (timeoutMs = 3000) => {
    const start = Date.now();
    return await new Promise<any>((resolve, reject) => {
      const tick = () => {
        // @ts-ignore
        if (typeof uploadcare !== 'undefined') return resolve((window as any).uploadcare);
        if (Date.now() - start > timeoutMs) return reject(new Error('Upload widget failed to load'));
        requestAnimationFrame(tick);
      };
      tick();
    });
  }, []);

  // Open upload dialog and return cdnUrl
  const openUploadDialog = useCallback(async (opts: any): Promise<string | null> => {
    try {
      const uc = await waitForUploadcare();
      const settings = { publicKey: uploadcareKey, multiple: false, ...opts };
      const dialog = uc.openDialog(null, settings);
      return await new Promise<string | null>((resolve) => {
        dialog.done((file: any) => {
          file.done((info: any) => resolve(info?.cdnUrl || (info?.cdnUrlModifiers ? info.cdnUrl + info.cdnUrlModifiers : null)));
        });
        dialog.fail(() => resolve(null));
      });
    } catch {
      return null;
    }
  }, [uploadcareKey, waitForUploadcare]);

  return { openUploadDialog };
}

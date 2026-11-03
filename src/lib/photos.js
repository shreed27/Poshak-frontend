import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Phone photos are 3–8 MB; shrink to ~150 KB before uploading.
export const compressImage = (file, max = 1280, quality = 0.72) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the photo'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image')); };
    img.src = url;
  });

// Uploads under <orderId>/… (storage policies only allow people linked to that order).
export const uploadOrderPhoto = async (orderId, file, label) => {
  const blob = await compressImage(file);
  const path = `${orderId}/${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from('order-photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
};

const cache = new Map();
export const useSignedUrls = (paths) => {
  const [urls, setUrls] = useState({});
  const key = (paths || []).join('|');
  useEffect(() => {
    const need = (paths || []).filter((p) => !cache.has(p));
    if (!supabase || (paths || []).length === 0) return undefined;
    let alive = true;
    const finish = () => alive && setUrls(Object.fromEntries((paths || []).map((p) => [p, cache.get(p)])));
    if (need.length === 0) { finish(); return undefined; }
    supabase.storage.from('order-photos').createSignedUrls(need, 3600).then(({ data }) => {
      (data || []).forEach((d) => d.signedUrl && cache.set(d.path, d.signedUrl));
      finish();
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
};

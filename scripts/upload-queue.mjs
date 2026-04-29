import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const dir = '/tmp/listas/imagenes faltantes listas';
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png'));
console.log('Archivos a procesar:', files.length);

const ts = Date.now();
let uploaded = 0, queued = 0, errors = [];

for (const f of files) {
  const safeName = f.replace(/[^a-zA-Z0-9._-]/g, '_');
  const pendingPath = `lote-faltantes-${ts}/${safeName}`;
  const buffer = fs.readFileSync(path.join(dir, f));

  const { error: upErr } = await supabase.storage
    .from('clean-images-pending')
    .upload(pendingPath, buffer, { contentType: 'image/png', upsert: true });
  if (upErr) { errors.push({ f, stage: 'upload', err: upErr.message }); continue; }
  uploaded++;

  const { error: qErr } = await supabase.from('clean_image_import_queue').insert({
    pending_path: pendingPath,
    original_filename: f,
    status: 'pending',
    suggested_perfume_ids: [],
    suggestion_scores: [],
  });
  if (qErr) { errors.push({ f, stage: 'queue', err: qErr.message }); continue; }
  queued++;
}

console.log(JSON.stringify({ uploaded, queued, errors }, null, 2));

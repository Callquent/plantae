import { promises as fs } from "fs";
import path from "path";
import { UPLOADS_DIR } from "@/lib/config";
import { MIME_BY_EXTENSION } from "@/lib/photo-constants";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = path.basename(file); // empêche toute sortie du dossier d'uploads
  const type = MIME_BY_EXTENSION[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, name));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

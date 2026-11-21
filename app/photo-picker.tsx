const FILE_CLS =
  "text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-green-100 file:px-3 file:py-1.5 file:font-semibold file:text-green-800 hover:file:bg-green-200";

/**
 * Photos d'une nouvelle plante ou d'un nouveau semis : depuis la galerie, ou prises directement
 * avec l'appareil photo du téléphone. Les deux champs s'appellent « photos » : l'action serveur reçoit les deux.
 */
export default function PhotoPicker({ hint }: { hint: string }) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium">Photos</legend>
      <label className="grid gap-1 text-sm font-medium">
        Prendre une photo
        <input name="photos" type="file" accept="image/*" capture="environment" className={FILE_CLS} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Ou choisir dans la galerie
        <input
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className={FILE_CLS}
        />
      </label>
      <span className="text-xs font-normal text-muted">{hint}</span>
    </fieldset>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addSeedlingPhotosAction,
  deleteSeedlingAction,
  failAction,
  germinateAction,
  removeSeedlingPhotoAction,
  resetAction,
  transplantAction,
  updateSeedlingAction,
} from "@/lib/seedling-actions";
import { withBase } from "@/lib/base-path";
import { getPlant, MAX_PHOTOS_PER_UPLOAD, todayISO } from "@/lib/plants";
import { expectedGermination, getSeedling, STATUS_LABELS } from "@/lib/seedlings";
import Gauge from "../../gauge";
import { Icon } from "../../icons";
import SeedlingForm from "../seedling-form";
import { formatDate, germinationGauge, progress, STATUS_CLS } from "../status";

export const dynamic = "force-dynamic";

export default async function SeedlingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSeedling(id);
  if (!s) notFound();

  const p = progress(s);
  const g = germinationGauge(s);
  const plant = s.plantId ? await getPlant(s.plantId) : undefined;
  const toSow = s.sownOn > todayISO(); // semis planifié : il ne peut pas encore lever

  return (
    <div className="grid max-w-2xl gap-10">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl">{s.name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[s.status]}`}>
            {STATUS_LABELS[s.status]}
          </span>
        </div>
        {s.species && <p className="-mt-3 italic text-muted">{s.species}</p>}

        <div className="grid max-w-md gap-3">
          {g ? (
            <Gauge ratio={g.ratio} tone={g.tone} caption={g.caption} label={`Levée de ${s.name}`} />
          ) : (
            <p className="font-medium text-fern-deep">{p.text}</p>
          )}
          {g && <p className="text-sm text-muted">Levée prévue le {formatDate(expectedGermination(s))}</p>}
        </div>
      </header>

      <section aria-labelledby="avancement" className="grid gap-5 border-t border-line pt-6">
        <h2 id="avancement" className="flex items-center gap-2.5 text-2xl">
          <Icon name="sprout" className="h-5 w-5 text-leaf-deep" />
          Avancement
        </h2>

        {s.status === "seme" && toSow && (
          <p className="text-muted">
            Ce semis est prévu le {formatDate(s.sownOn)}. Vous pourrez noter sa levée à partir de cette date.
          </p>
        )}

        {s.status === "seme" && !toSow && (
          <>
            <form action={germinateAction.bind(null, s.id)} className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Date de levée
                <input name="date" type="date" min={s.sownOn} max={todayISO()} defaultValue={todayISO()} className="field" />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Graines levées
                <input name="count" type="number" min={1} max={s.quantity} defaultValue={s.quantity} className="field w-32" />
              </label>
              <button className="btn">
                <Icon name="sprout" />
                Marquer comme levé
              </button>
            </form>
            <form action={failAction.bind(null, s.id)}>
              <button className="btn-text">Le semis n'a pas levé</button>
            </form>
          </>
        )}

        {s.status === "leve" && (
          <div className="flex flex-wrap items-center gap-5">
            <form action={transplantAction.bind(null, s.id)}>
              <button className="btn">
                <Icon name="leaf" />
                Transplanter : créer la plante
              </button>
            </form>
            <form action={failAction.bind(null, s.id)}>
              <button className="btn-text">Marquer comme échec</button>
            </form>
          </div>
        )}

        {s.status === "transplante" && (
          <p>
            {plant ? (
              <Link href={`/plantes/${plant.id}`} className="btn-quiet">
                <Icon name="leaf" />
                Voir la plante « {plant.name} »
              </Link>
            ) : (
              <span className="text-muted">La plante créée à partir de ce semis a été supprimée.</span>
            )}
          </p>
        )}

        {(s.status === "leve" || s.status === "echec") && (
          <form action={resetAction.bind(null, s.id)}>
            <button className="btn-quiet">Remettre en « semé »</button>
          </form>
        )}
      </section>

      <section aria-labelledby="photos" className="grid gap-5 border-t border-line pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="photos" className="flex items-center gap-2.5 text-2xl">
            <Icon name="camera" className="h-5 w-5 text-green-600" />
            Photos
          </h2>
          <p className="text-sm text-muted">
            {s.photos.length} photo{s.photos.length > 1 ? "s" : ""}
          </p>
        </div>

        <form
          action={addSeedlingPhotosAction.bind(null, s.id)}
          className="grid gap-3 rounded-xl border border-dashed border-green-300 bg-green-50/70 p-4"
        >
          <label className="grid gap-1 text-sm font-medium">
            Ajouter des photos
            <input
              name="photos"
              type="file"
              multiple
              required
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-3 file:py-1.5 file:font-semibold file:text-white hover:file:bg-green-800"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Date de la prise de vue
              <input name="date" type="date" max={todayISO()} defaultValue={todayISO()} className="field" />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Observation
              <input name="note" placeholder="Premières feuilles, moisissure…" className="field" />
            </label>
          </div>
          <p className="text-xs text-muted">
            JPEG, PNG, WebP ou GIF, 8 Mo maximum par photo, {MAX_PHOTOS_PER_UPLOAD} photos par envoi.
          </p>
          <button className="btn justify-self-start">
            <Icon name="plus" />
            Ajouter les photos
          </button>
        </form>

        {s.photos.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {s.photos.map((photo) => (
              <li key={photo.id} className="overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                <a href={withBase(`/photos/${photo.file}`)} target="_blank" rel="noreferrer" className="block bg-green-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={withBase(`/photos/${photo.file}`)}
                    alt={`${s.name}, ${formatDate(photo.date)}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </a>
                <div className="grid gap-1.5 p-3 text-sm">
                  <span className="font-semibold">{formatDate(photo.date)}</span>
                  {photo.note && <p className="text-muted">{photo.note}</p>}
                  <form action={removeSeedlingPhotoAction.bind(null, s.id, photo.id)}>
                    <button className="btn-danger">Supprimer la photo</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="infos" className="grid gap-4 border-t border-line pt-6">
        <h2 id="infos" className="text-2xl">
          Informations
        </h2>
        <SeedlingForm action={updateSeedlingAction.bind(null, s.id)} seedling={s} submitLabel="Enregistrer" />
      </section>

      <form action={deleteSeedlingAction.bind(null, s.id)}>
        <button className="btn-danger">Supprimer ce semis</button>
      </form>
    </div>
  );
}

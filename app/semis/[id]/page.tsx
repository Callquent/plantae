import Link from "next/link";
import { notFound } from "next/navigation";
import PhotoCard from "@/components/photos/photo-card";
import PhotoUploadForm from "@/components/photos/photo-upload-form";
import SeedlingForm from "@/components/seedlings/seedling-form";
import StatusBadge from "@/components/seedlings/status-badge";
import Field from "@/components/ui/field";
import Gauge from "@/components/ui/gauge";
import { Icon } from "@/components/ui/icons";
import Section from "@/components/ui/section";
import { todayISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { getPlant } from "@/lib/plants/service";
import {
  addSeedlingPhotosAction,
  deleteSeedlingAction,
  failAction,
  germinateAction,
  removeSeedlingPhotoAction,
  resetAction,
  transplantAction,
  updateSeedlingAction,
} from "@/lib/seedlings/actions";
import { getSeedling } from "@/lib/seedlings/service";
import { expectedGermination, germinationGauge, progress } from "@/lib/seedlings/status";

export const dynamic = "force-dynamic";

export default async function SeedlingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSeedling(id);
  if (!s) notFound();

  const p = progress(s);
  const g = germinationGauge(s);
  const plant = s.plantId ? await getPlant(s.plantId) : undefined;
  const today = todayISO();
  const toSow = s.sownOn > today; // semis planifié : il ne peut pas encore lever

  return (
    <div className="grid max-w-2xl gap-10">
      <header className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl">{s.name}</h1>
          <StatusBadge status={s.status} />
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

      <Section id="avancement" title="Avancement" icon="sprout" iconClassName="text-leaf-deep">
        {s.status === "seme" && toSow && (
          <p className="text-muted">
            Ce semis est prévu le {formatDate(s.sownOn)}. Vous pourrez noter sa levée à partir de cette date.
          </p>
        )}

        {s.status === "seme" && !toSow && (
          <>
            <form action={germinateAction.bind(null, s.id)} className="flex flex-wrap items-end gap-3">
              <Field label="Date de levée">
                <input name="date" type="date" min={s.sownOn} max={today} defaultValue={today} className="field" />
              </Field>
              <Field label="Graines levées">
                <input name="count" type="number" min={1} max={s.quantity} defaultValue={s.quantity} className="field w-32" />
              </Field>
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
      </Section>

      <Section id="photos" title="Photos" icon="camera" aside={`${s.photos.length} photo${s.photos.length > 1 ? "s" : ""}`}>
        <PhotoUploadForm
          action={addSeedlingPhotosAction.bind(null, s.id)}
          today={today}
          notePlaceholder="Premières feuilles, moisissure…"
          submitLabel="Ajouter les photos"
        />

        {s.photos.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {s.photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                file={photo.file}
                alt={`${s.name}, ${formatDate(photo.date)}`}
                date={photo.date}
                note={photo.note}
              >
                <form action={removeSeedlingPhotoAction.bind(null, s.id, photo.id)}>
                  <button className="btn-danger">Supprimer la photo</button>
                </form>
              </PhotoCard>
            ))}
          </ul>
        )}
      </Section>

      <Section id="infos" title="Informations" gap="gap-4">
        <SeedlingForm action={updateSeedlingAction.bind(null, s.id)} seedling={s} submitLabel="Enregistrer" />
      </Section>

      <form action={deleteSeedlingAction.bind(null, s.id)}>
        <button className="btn-danger">Supprimer ce semis</button>
      </form>
    </div>
  );
}

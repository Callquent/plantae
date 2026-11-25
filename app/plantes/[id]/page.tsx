import { notFound } from "next/navigation";
import Cover from "@/components/photos/cover";
import PhotoCard from "@/components/photos/photo-card";
import PhotoUploadForm from "@/components/photos/photo-upload-form";
import HealthBadge from "@/components/plants/health-badge";
import HealthSelect from "@/components/plants/health-select";
import PlantForm from "@/components/plants/plant-form";
import Field from "@/components/ui/field";
import Gauge from "@/components/ui/gauge";
import { Icon } from "@/components/ui/icons";
import Section from "@/components/ui/section";
import { todayISO } from "@/lib/dates";
import { formatDate, formatLongDate } from "@/lib/format";
import {
  addPhotosAction,
  addWateringAction,
  deletePlantAction,
  removePhotoAction,
  removeWateringAction,
  updatePhotoAction,
  updatePlantAction,
  waterPlantAction,
} from "@/lib/plants/actions";
import { getPlant } from "@/lib/plants/service";
import { averageInterval, coverPhoto, wateringGauge } from "@/lib/plants/status";

export const dynamic = "force-dynamic";

export default async function PlantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plant = await getPlant(id);
  if (!plant) notFound();

  const avg = averageInterval(plant);
  const g = wateringGauge(plant);
  const today = todayISO();

  return (
    <div className="grid max-w-3xl gap-10">
      <header className="flex flex-wrap items-start gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-green-100 text-green-400 sm:h-28 sm:w-28">
          <Cover file={coverPhoto(plant)?.file} iconClassName="h-10 w-10" lazy={false} />
        </div>
        <div className="grid min-w-0 flex-1 gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl">{plant.name}</h1>
            {plant.species && <p className="italic text-muted">{plant.species}</p>}
          </div>
          <div className="grid max-w-sm gap-3">
            <Gauge ratio={g.ratio} tone={g.tone} caption={g.caption} label={`Arrosage de ${plant.name}`} />
            <form action={waterPlantAction.bind(null, plant.id)}>
              <button className="btn">
                <Icon name="drop" />
                Arrosée aujourd'hui
              </button>
            </form>
          </div>
        </div>
      </header>

      <Section
        id="journal"
        title="Journal photo"
        icon="camera"
        aside={`${plant.photos.length} photo${plant.photos.length > 1 ? "s" : ""}`}
      >
        <PhotoUploadForm
          action={addPhotosAction.bind(null, plant.id)}
          today={today}
          withHealth
          notePlaceholder="Feuilles jaunies, nouvelle pousse, parasites…"
          submitLabel="Ajouter au journal"
          hint="La date, l'état et l'observation valent pour toutes les photos de l'envoi."
        />

        {plant.photos.length === 0 ? (
          <p className="text-sm text-muted">Aucune photo pour l'instant : la première servira de couverture.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {plant.photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                file={photo.file}
                alt={`${plant.name}, ${formatDate(photo.date)}`}
                date={photo.date}
                note={photo.note}
                badge={photo.health && <HealthBadge health={photo.health} className="text-xs" />}
              >
                <details className="rounded-lg bg-green-50/70 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold text-green-800">
                    Modifier l'état de santé
                  </summary>
                  <form action={updatePhotoAction.bind(null, plant.id, photo.id)} className="mt-3 grid gap-3">
                    <Field label="État de santé">
                      <HealthSelect defaultValue={photo.health ?? ""} />
                    </Field>
                    <Field label="Observation">
                      <input name="note" defaultValue={photo.note} className="field" />
                    </Field>
                    <button className="btn-quiet justify-self-start">Enregistrer</button>
                  </form>
                </details>
                <form action={removePhotoAction.bind(null, plant.id, photo.id)}>
                  <button className="btn-danger">Supprimer la photo</button>
                </form>
              </PhotoCard>
            ))}
          </ul>
        )}
      </Section>

      <Section
        id="arrosages"
        title="Historique d'arrosage"
        icon="drop"
        iconClassName="text-rain"
        aside={`${plant.waterings.length} arrosage${plant.waterings.length > 1 ? "s" : ""}${
          avg !== null ? `, un tous les ${avg} j en moyenne pour un objectif de ${plant.wateringEveryDays} j` : ""
        }`}
      >
        <form action={addWateringAction.bind(null, plant.id)} className="flex flex-wrap items-end gap-3">
          <Field label="Ajouter un arrosage passé">
            <input name="date" type="date" required max={today} defaultValue={today} className="field" />
          </Field>
          <button className="btn-quiet">Ajouter</button>
        </form>

        {plant.waterings.length === 0 ? (
          <p className="text-sm text-muted">Aucun arrosage enregistré.</p>
        ) : (
          <ol className="ml-1.5 border-l border-line">
            {plant.waterings.map((date, i) => (
              <li key={date} className="relative flex items-center justify-between gap-3 py-2 pl-5 text-sm">
                <span
                  aria-hidden
                  className={`absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-2 ring-ground ${
                    i === 0 ? "bg-rain" : "bg-green-300"
                  }`}
                />
                <span className="first-letter:uppercase">
                  {formatLongDate(date)}
                  {i === 0 && (
                    <span className="ml-2 rounded-full bg-rain/15 px-2 py-0.5 text-xs font-semibold text-rain-deep">
                      dernier
                    </span>
                  )}
                </span>
                <form action={removeWateringAction.bind(null, plant.id, date)}>
                  <button className="btn-danger" aria-label={`Supprimer l'arrosage du ${formatDate(date)}`}>
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section id="infos" title="Informations" gap="gap-4">
        <PlantForm action={updatePlantAction.bind(null, plant.id)} plant={plant} submitLabel="Enregistrer" />
      </Section>

      <form action={deletePlantAction.bind(null, plant.id)}>
        <button className="btn-danger">Supprimer cette plante et toutes ses photos</button>
      </form>
    </div>
  );
}

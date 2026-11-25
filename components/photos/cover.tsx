import { Icon } from "@/components/ui/icons";
import { photoUrl } from "@/lib/base-path";

/** Photo de couverture, ou une feuille quand il n'y en a pas. Se loge dans un conteneur de taille fixe. */
export default function Cover({
  file,
  iconClassName,
  lazy = true,
}: {
  file?: string;
  iconClassName: string;
  lazy?: boolean;
}) {
  if (!file) {
    return (
      <span className="grid h-full place-items-center text-green-400">
        <Icon name="leaf" className={iconClassName} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoUrl(file)} alt="" loading={lazy ? "lazy" : undefined} className="h-full w-full object-cover" />;
}

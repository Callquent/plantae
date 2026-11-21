/**
 * File d'attente par nom : les tâches d'un même verrou passent l'une après l'autre.
 * Les modifications lisent puis réécrivent un fichier entier ; sans cela, deux envois simultanés
 * (photos du téléphone, synchronisation avec l'autre PC, deux onglets) pourraient s'écraser.
 * Vit sur globalThis pour rester unique même si le module est chargé plusieurs fois.
 */
const g = globalThis as typeof globalThis & { __locks?: Map<string, Promise<unknown>> };

export function serialize<T>(name: string, task: () => Promise<T>): Promise<T> {
  const locks = (g.__locks ??= new Map());
  const previous = locks.get(name) ?? Promise.resolve();
  const run = previous.then(task);
  locks.set(name, run.catch(() => undefined));
  return run;
}

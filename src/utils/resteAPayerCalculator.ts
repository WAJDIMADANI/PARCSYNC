export function calculateResteAPayer(
  dateDebutContrat: string,
  dureeContratMois: number | '',
  mensualiteTtc: number | ''
): number {
  if (!dateDebutContrat || dureeContratMois === '' || mensualiteTtc === '') {
    return 0;
  }

  const dateDebut = new Date(dateDebutContrat);
  const aujourd = new Date();

  const moisEcoules = Math.max(0,
    (aujourd.getFullYear() - dateDebut.getFullYear()) * 12 +
    (aujourd.getMonth() - dateDebut.getMonth())
  );

  const moisRestants = Math.max(0, Number(dureeContratMois) - moisEcoules);

  const resteAPayer = moisRestants * Number(mensualiteTtc);

  return Math.round(resteAPayer * 100) / 100;
}

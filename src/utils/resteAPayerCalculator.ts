export function calculateResteAPayer(
  dateDebutContrat: string,
  dureeContratMois: number | '',
  mensualiteTtc: number | ''
): number {
  if (!dateDebutContrat || dureeContratMois === '' || mensualiteTtc === '') {
    return 0;
  }

  const dateDebut = new Date(dateDebutContrat);
  const aujourdhui = new Date();

  let mensualitesEcoulees = 0;

  if (aujourdhui >= dateDebut) {
    const ecartMois =
      (aujourdhui.getFullYear() - dateDebut.getFullYear()) * 12 +
      (aujourdhui.getMonth() - dateDebut.getMonth());

    if (aujourdhui.getDate() >= dateDebut.getDate()) {
      mensualitesEcoulees = ecartMois + 1;
    } else {
      mensualitesEcoulees = ecartMois;
    }
  }

  const mensualitesRestantes = Math.max(0, Number(dureeContratMois) - mensualitesEcoulees);

  const resteAPayer = mensualitesRestantes * Number(mensualiteTtc);

  return Math.round(resteAPayer * 100) / 100;
}

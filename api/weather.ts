import type { Request, Response } from 'express';

export default async function handler(req: Request | any, res: Response | any) {
  const simulated = {
    temp: 21,
    condition: 'partly_cloudy',
    conditionText: 'Częściowo słonecznie, bez opadów',
    rainChanceToday: 10,
    rainChanceTomorrow: 80,
    tomorrowConditionText: 'Przelotne burze i intensywny deszcz od południa',
    recommendation: 'Jutro prognozowane są opady deszczu (80%). Jeśli planujesz koszenie trawy lub cięcie drewna, warto zrobić to dzisiaj!',
    recommendedShifts: [
      { taskId: 'task-mow-lawn', action: 'do_today', reason: 'Jutro mokra trawa uniemożliwi równe koszenie.' },
      { taskId: 'task-wood-cut', action: 'do_today', reason: 'Suche drewno lepiej układać w drewutni przed deszczem.' },
    ],
  };
  return res.status(200).json(simulated);
}

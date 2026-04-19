import Papa from "papaparse";

export type PtCardRow = {
  cardId: number;
  cardTitle: string;
  overall: number;
  firstName: string;
  lastName: string;
  bats: number;
  throws: number;
  positionCode: number;
  pitcherRoleCode: number;
  contactVL: number;
  gapVL: number;
  powerVL: number;
  eyeVL: number;
  avoidKVL: number;
  contactVR: number;
  gapVR: number;
  powerVR: number;
  eyeVR: number;
  avoidKVR: number;
  stuff: number;
  movement: number;
  control: number;
  stamina: number;
  posRatingP: number;
  posRatingC: number;
  posRating1B: number;
  posRating2B: number;
  posRating3B: number;
  posRatingSS: number;
  posRatingLF: number;
  posRatingCF: number;
  posRatingRF: number;
  owned: boolean;
  sellOrderLow: number;
  last10Price: number;
};

function n(val: string | undefined): number {
  if (val === undefined || val === null || val.trim() === "") return 0;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

function ni(val: string | undefined): number {
  if (val === undefined || val === null || val.trim() === "") return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function parsePtCardList(csvText: string): PtCardRow[] {
  const lines = csvText.split("\n");
  if (lines.length > 0 && lines[0].startsWith("//")) {
    lines[0] = lines[0].slice(2);
  }
  const cleanedText = lines.join("\n");

  const result = Papa.parse<string[]>(cleanedText, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.data.length === 0) return [];

  const rows: PtCardRow[] = [];
  const dataRows = result.data.slice(1);

  for (const cols of dataRows) {
    const cardId = ni(cols[1]);
    if (!cardId) continue;

    rows.push({
      cardTitle: (cols[0] ?? "").trim(),
      cardId,
      overall: ni(cols[2]),
      lastName: (cols[12] ?? "").trim(),
      firstName: (cols[13] ?? "").trim(),
      bats: ni(cols[19]),
      throws: ni(cols[20]),
      positionCode: ni(cols[21]),
      pitcherRoleCode: ni(cols[22]),
      contactVL: n(cols[29]),
      gapVL: n(cols[30]),
      powerVL: n(cols[31]),
      eyeVL: n(cols[32]),
      avoidKVL: n(cols[33]),
      contactVR: n(cols[35]),
      gapVR: n(cols[36]),
      powerVR: n(cols[37]),
      eyeVR: n(cols[38]),
      avoidKVR: n(cols[39]),
      stuff: n(cols[50]),
      movement: n(cols[51]),
      control: n(cols[52]),
      stamina: n(cols[77]),
      posRatingP: n(cols[93]),
      posRatingC: n(cols[94]),
      posRating1B: n(cols[95]),
      posRating2B: n(cols[96]),
      posRating3B: n(cols[97]),
      posRatingSS: n(cols[98]),
      posRatingLF: n(cols[99]),
      posRatingCF: n(cols[100]),
      posRatingRF: n(cols[101]),
      owned: ni(cols[107]) === 1,
      sellOrderLow: n(cols[109]),
      last10Price: n(cols[110]),
    });
  }

  return rows;
}

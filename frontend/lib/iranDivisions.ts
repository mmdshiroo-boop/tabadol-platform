// frontend/lib/iranDivisions.ts
export type DivisionType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IranDivision {
  Id: number;
  ParentCountryDivisionId?: number;
  Name: string;
  Code: string;
  DivisionType: DivisionType;
}

let allDivisions: IranDivision[] = [];
let loaded = false;

export async function loadDivisions(): Promise<void> {
  if (loaded) return;
  try {
    const res = await fetch("/data/iran.json");
    if (!res.ok) throw new Error("Failed to load iran.json");

    // دریافت متن و حذف کاراکترهای کنترل نامعتبر
    let text = await res.text();
    text = text.replace(/[\u0000-\u001F]/g, "");

    allDivisions = JSON.parse(text);
    loaded = true;
  } catch (error) {
    console.error("Error loading divisions:", error);
    allDivisions = [];
  }
}

export const getRoot = (): IranDivision | undefined =>
  allDivisions.find((d) => d.DivisionType === 0);

export const getProvinces = (): IranDivision[] =>
  allDivisions.filter((d) => d.DivisionType === 1);

export const getChildren = (
  parentId: number,
  types?: DivisionType[],
): IranDivision[] =>
  allDivisions.filter(
    (d) =>
      d.ParentCountryDivisionId === parentId &&
      (!types || types.includes(d.DivisionType)),
  );

export const getCounties = (provinceId: number): IranDivision[] =>
  getChildren(provinceId, [2]);

export const getDistricts = (countyId: number): IranDivision[] =>
  getChildren(countyId, [3]);

export const getCities = (districtId: number): IranDivision[] =>
  getChildren(districtId, [4]);

export const getVillages = (districtId: number): IranDivision[] =>
  getChildren(districtId, [5, 6]);

export const getById = (id: number): IranDivision | undefined =>
  allDivisions.find((d) => d.Id === id);

export const searchDivisions = (
  query: string,
  types?: DivisionType[],
): IranDivision[] => {
  const q = query.trim();
  if (!q) return [];
  return allDivisions.filter(
    (d) =>
      d.Name.includes(q) &&
      (!types || types.includes(d.DivisionType)),
  );
};

export const getFullPath = (id: number): IranDivision[] => {
  const path: IranDivision[] = [];
  let current = getById(id);
  while (current) {
    path.unshift(current);
    if (current.ParentCountryDivisionId === 1) break;
    current = getById(current.ParentCountryDivisionId!);
  }
  return path;
};

// 🆕 توابع مقاوم برای تطبیق نام‌ها با سرویس‌های خارجی
export function normalizeName(name: string): string {
  return name
    .replace(/استان/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findProvinceByName(name: string): IranDivision | undefined {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  // تطبیق دقیق
  const exact = allDivisions.find(
    (d) => d.DivisionType === 1 && normalizeName(d.Name) === normalized
  );
  if (exact) return exact;

  // تطبیق شامل (یک طرفه)
  const includes = allDivisions.find(
    (d) =>
      d.DivisionType === 1 &&
      (normalizeName(d.Name).includes(normalized) ||
        normalized.includes(normalizeName(d.Name)))
  );
  return includes;
}

export function findCountyByName(
  provinceId: number,
  name: string
): IranDivision | undefined {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;

  const counties = getCounties(provinceId);
  const exact = counties.find(
    (c) => normalizeName(c.Name) === normalized
  );
  if (exact) return exact;

  const includes = counties.find(
    (c) =>
      normalizeName(c.Name).includes(normalized) ||
      normalized.includes(normalizeName(c.Name))
  );
  return includes;
}
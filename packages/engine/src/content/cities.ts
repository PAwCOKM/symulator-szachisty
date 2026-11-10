const RAW = [
  'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Katowice', 'Łódź', 'Lublin', 'Białystok', 'Szczecin',
  'Rzeszów', 'Bydgoszcz', 'Gorzów Wlkp.', 'Legnica', 'Gliwice', 'Bochnia', 'Wadowice', 'Rybnik', 'Zabrze', 'Kielce',
  'Opole', 'Toruń', 'Olsztyn', 'Zielona Góra', 'Radom', 'Tarnów', 'Nowy Sącz', 'Elbląg', 'Płock', 'Kalisz',
  'Gdynia', 'Sopot', 'Koszalin', 'Słupsk', 'Piła', 'Konin', 'Leszno', 'Włocławek', 'Grudziądz', 'Ostrołęka',
  'Siedlce', 'Biała Podlaska', 'Chełm', 'Zamość', 'Przemyśl', 'Krosno', 'Sanok', 'Mielec', 'Stalowa Wola', 'Jasło',
  'Bielsko-Biała', 'Częstochowa', 'Sosnowiec', 'Bytom', 'Tychy', 'Chorzów', 'Racibórz', 'Cieszyn', 'Oświęcim', 'Zakopane',
  'Wałbrzych', 'Jelenia Góra', 'Świdnica', 'Głogów', 'Lubin', 'Kłodzko', 'Nysa', 'Kędzierzyn-Koźle', 'Brzeg', 'Opoczno',
  'Piotrków Trybunalski', 'Skierniewice', 'Pabianice', 'Sieradz', 'Łomża', 'Suwałki', 'Ełk', 'Giżycko', 'Mrągowo', 'Kołobrzeg',
  'Puławy', 'Głogów Małopolski', 'Parczew', 'Annopol', 'Międzyrzec Podlaski', 'Radzyń Podlaski',
  'Świnoujście', 'Stargard', 'Police', 'Gniezno', 'Ostrów Wielkopolski', 'Września',
];

/** Miasta posortowane alfabetycznie (polskie znaki). */
export const CITIES: string[] = [...RAW].sort((a, b) => a.localeCompare(b, 'pl'));

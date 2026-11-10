import type { Rng } from '../rng';

/** Zagraniczni zawodnicy: kraj, waga w puli i listy imion/nazwisk (zmyślone zestawienia, bez prawdziwych osób). */
interface Nation {
  code: string;
  weight: number;
  first: string[];
  firstF: string[];
  last: string[];
  /** nazwiska żeńskie, jeśli różnią się od męskich */
  lastF?: string[];
}

const NATIONS: Nation[] = [
  { code: 'USA', weight: 9, first: ['James', 'Michael', 'Daniel', 'Ryan', 'Kevin', 'Brandon', 'Jonathan', 'Eric', 'Tyler', 'Nathan'], firstF: ['Emily', 'Jessica', 'Sarah', 'Megan', 'Laura', 'Amanda'], last: ['Walker', 'Brooks', 'Hayes', 'Sullivan', 'Parker', 'Reynolds', 'Fletcher', 'Gallagher', 'Mitchell', 'Dawson'] },
  { code: 'IND', weight: 12, first: ['Arjun', 'Rohan', 'Vikram', 'Karthik', 'Aditya', 'Nikhil', 'Siddharth', 'Pranav', 'Rahul', 'Harsh'], firstF: ['Priya', 'Ananya', 'Divya', 'Kavya', 'Meera', 'Sneha'], last: ['Sharma', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Kulkarni', 'Banerjee', 'Chatterjee', 'Desai', 'Pillai'] },
  { code: 'CHN', weight: 8, first: ['Wei', 'Jun', 'Lei', 'Hao', 'Ming', 'Tao', 'Yang', 'Bo', 'Chen', 'Long'], firstF: ['Mei', 'Lan', 'Xia', 'Ying', 'Hui', 'Fang'], last: ['Zhang', 'Wang', 'Liu', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Xu', 'Sun', 'Ma'] },
  { code: 'RUS', weight: 9, first: ['Dmitri', 'Sergei', 'Alexei', 'Nikolai', 'Andrei', 'Maxim', 'Vladimir', 'Pavel', 'Ilya', 'Roman'], firstF: ['Natalya', 'Svetlana', 'Elena', 'Irina', 'Tatiana', 'Ksenia'], last: ['Orlov', 'Sokolov', 'Morozov', 'Popov', 'Fedorov', 'Zaitsev', 'Belov', 'Kuznetsov', 'Lebedev', 'Smirnov'], lastF: ['Orlova', 'Sokolova', 'Morozova', 'Popova', 'Fedorova', 'Zaitseva', 'Belova', 'Kuznetsova', 'Lebedeva', 'Smirnova'] },
  { code: 'UKR', weight: 8, first: ['Oleksandr', 'Taras', 'Bohdan', 'Yaroslav', 'Mykola', 'Andriy', 'Vasyl', 'Denys', 'Stepan', 'Ruslan'], firstF: ['Oksana', 'Iryna', 'Kateryna', 'Nataliya', 'Olha', 'Mariya'], last: ['Kovalenko', 'Bondarenko', 'Shevchenko', 'Melnyk', 'Tkachenko', 'Savchenko', 'Lysenko', 'Kravchuk', 'Moroz', 'Polishchuk'], lastF: ['Kovalenko', 'Bondarenko', 'Shevchenko', 'Melnyk', 'Tkachenko', 'Savchenko', 'Lysenko', 'Kravchuk', 'Moroz', 'Polishchuk'] },
  { code: 'GER', weight: 7, first: ['Lukas', 'Jonas', 'Felix', 'Matthias', 'Stefan', 'Florian', 'Jan', 'Tobias', 'Moritz', 'Klaus'], firstF: ['Anja', 'Katrin', 'Sabine', 'Lena', 'Julia', 'Birgit'], last: ['Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Richter', 'Wolf', 'Neumann', 'Braun', 'Krüger', 'Hartmann'] },
  { code: 'FRA', weight: 6, first: ['Julien', 'Thomas', 'Antoine', 'Nicolas', 'Maxime', 'Baptiste', 'Hugo', 'Romain', 'Etienne', 'Quentin'], firstF: ['Camille', 'Chloé', 'Marion', 'Elodie', 'Claire', 'Sophie'], last: ['Dubois', 'Lefèvre', 'Moreau', 'Fournier', 'Girard', 'Bonnet', 'Lambert', 'Rousseau', 'Mercier', 'Faure'] },
  { code: 'ESP', weight: 5, first: ['Javier', 'Alejandro', 'Sergio', 'Pablo', 'Diego', 'Raúl', 'Iván', 'Álvaro', 'Rubén', 'Hugo'], firstF: ['Lucía', 'Carmen', 'Marta', 'Elena', 'Paula', 'Irene'], last: ['Navarro', 'Romero', 'Castillo', 'Ortega', 'Delgado', 'Vargas', 'Herrera', 'Molina', 'Cabrera', 'Serrano'] },
  { code: 'ARM', weight: 4, first: ['Levon', 'Tigran', 'Armen', 'Gor', 'Davit', 'Karen', 'Hayk', 'Vahe', 'Narek', 'Artur'], firstF: ['Anna', 'Lilit', 'Mariam', 'Nare', 'Siranush', 'Hasmik'], last: ['Hakobyan', 'Petrosyan', 'Grigoryan', 'Sargsyan', 'Avetisyan', 'Mkrtchyan', 'Harutyunyan', 'Gasparyan'] },
  { code: 'AZE', weight: 4, first: ['Rauf', 'Elmar', 'Teimour', 'Farid', 'Vugar', 'Emin', 'Nijat', 'Rashad', 'Samir', 'Zaur'], firstF: ['Aysel', 'Leyla', 'Narmin', 'Gunay', 'Sevinj', 'Nigar'], last: ['Mammadov', 'Aliyev', 'Huseynov', 'Guliyev', 'Hasanov', 'Ismayilov', 'Rzayev', 'Babayev'], lastF: ['Mammadova', 'Aliyeva', 'Huseynova', 'Guliyeva', 'Hasanova', 'Ismayilova', 'Rzayeva', 'Babayeva'] },
  { code: 'NOR', weight: 3, first: ['Henrik', 'Sindre', 'Espen', 'Lars', 'Torstein', 'Magnus', 'Eirik', 'Jørgen'], firstF: ['Ingrid', 'Silje', 'Marte', 'Hilde', 'Astrid', 'Tuva'], last: ['Haugen', 'Lindqvist', 'Strand', 'Berg', 'Dahl', 'Moen', 'Solberg', 'Lund'] },
  { code: 'NED', weight: 4, first: ['Bram', 'Joost', 'Sander', 'Daan', 'Ruud', 'Wouter', 'Pieter', 'Joris'], firstF: ['Anouk', 'Femke', 'Sanne', 'Lotte', 'Marloes', 'Eline'], last: ['de Vries', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder'] },
  { code: 'IRI', weight: 4, first: ['Amir', 'Reza', 'Behrouz', 'Kourosh', 'Parham', 'Arash', 'Mehdi', 'Saman'], firstF: ['Sara', 'Mina', 'Niloufar', 'Shabnam', 'Atousa', 'Golnaz'], last: ['Rahimi', 'Karimi', 'Hosseini', 'Jafari', 'Ghorbani', 'Mousavi', 'Tehrani', 'Farahani'] },
  { code: 'UZB', weight: 4, first: ['Jasur', 'Timur', 'Bobur', 'Sardor', 'Otabek', 'Nodir', 'Akmal', 'Rustam'], firstF: ['Madina', 'Dilnoza', 'Gulnara', 'Zarina', 'Nilufar', 'Sevara'], last: ['Karimov', 'Rakhimov', 'Yusupov', 'Tashkentov', 'Abdullaev', 'Nazarov', 'Saidov', 'Umarov'], lastF: ['Karimova', 'Rakhimova', 'Yusupova', 'Tashkentova', 'Abdullaeva', 'Nazarova', 'Saidova', 'Umarova'] },
  { code: 'HUN', weight: 4, first: ['Gábor', 'Balázs', 'Zoltán', 'Attila', 'Máté', 'Dániel', 'Péter', 'Tamás'], firstF: ['Réka', 'Zsófia', 'Eszter', 'Katalin', 'Nóra', 'Lilla'], last: ['Szabó', 'Tóth', 'Horváth', 'Varga', 'Kovács', 'Fekete', 'Balogh', 'Sipos'] },
  { code: 'ENG', weight: 5, first: ['Oliver', 'Harry', 'George', 'Jack', 'Edward', 'Henry', 'Samuel', 'Callum'], firstF: ['Charlotte', 'Emma', 'Hannah', 'Rebecca', 'Alice', 'Victoria'], last: ['Ashworth', 'Whitmore', 'Hargreaves', 'Pemberton', 'Thornton', 'Ellison', 'Radcliffe', 'Kingsley'] },
  { code: 'ROU', weight: 3, first: ['Andrei', 'Radu', 'Mihai', 'Cristian', 'Bogdan', 'Vlad', 'Ionut', 'Sorin'], firstF: ['Ioana', 'Andreea', 'Elena', 'Maria', 'Alina', 'Raluca'], last: ['Popescu', 'Ionescu', 'Dumitru', 'Stanescu', 'Constantin', 'Marin', 'Radu', 'Dobre'] },
  { code: 'CZE', weight: 3, first: ['Tomas', 'Jiri', 'Martin', 'Ondrej', 'Vojtech', 'Radek', 'Lukas', 'Petr'], firstF: ['Katerina', 'Tereza', 'Lucie', 'Eliska', 'Barbora', 'Jana'], last: ['Novotny', 'Svoboda', 'Dvorak', 'Cerny', 'Prochazka', 'Kral', 'Vesely', 'Horak'], lastF: ['Novotna', 'Svobodova', 'Dvorakova', 'Cerna', 'Prochazkova', 'Kralova', 'Vesela', 'Horakova'] },
  { code: 'SRB', weight: 3, first: ['Nemanja', 'Milos', 'Stefan', 'Dusan', 'Luka', 'Marko', 'Nikola', 'Vuk'], firstF: ['Jelena', 'Milica', 'Ana', 'Marija', 'Tamara', 'Ivana'], last: ['Jovanovic', 'Petrovic', 'Nikolic', 'Markovic', 'Djordjevic', 'Stojanovic', 'Ilic', 'Pavlovic'] },
  { code: 'TUR', weight: 3, first: ['Emre', 'Burak', 'Mert', 'Cem', 'Kerem', 'Onur', 'Baran', 'Efe'], firstF: ['Elif', 'Zeynep', 'Selin', 'Ayse', 'Defne', 'Merve'], last: ['Kaya', 'Demir', 'Celik', 'Sahin', 'Arslan', 'Dogan', 'Aydin', 'Polat'] },
  { code: 'ISR', weight: 3, first: ['Eitan', 'Yoav', 'Omer', 'Itai', 'Nadav', 'Amit', 'Gal', 'Tomer'], firstF: ['Noa', 'Shira', 'Tamar', 'Yael', 'Maya', 'Michal'], last: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Friedman', 'Katz', 'Shapira'] },
  { code: 'ITA', weight: 3, first: ['Marco', 'Luca', 'Matteo', 'Andrea', 'Fabio', 'Giorgio', 'Stefano', 'Davide'], firstF: ['Giulia', 'Francesca', 'Chiara', 'Valentina', 'Silvia', 'Elisa'], last: ['Rossetti', 'Bianchi', 'Ferraro', 'Moretti', 'Gallo', 'Conti', 'Barbieri', 'Costa'] },
  { code: 'KAZ', weight: 2, first: ['Nurlan', 'Askar', 'Daulet', 'Yerlan', 'Aidos', 'Dias', 'Ruslan', 'Marat'], firstF: ['Aigerim', 'Dinara', 'Aliya', 'Saltanat', 'Zhanar', 'Madina'], last: ['Sarsenov', 'Nurgaliev', 'Abenov', 'Kasymov', 'Tulegenov', 'Baimukhanov', 'Zhaksylykov'], lastF: ['Sarsenova', 'Nurgalieva', 'Abenova', 'Kasymova', 'Tulegenova', 'Baimukhanova', 'Zhaksylykova'] },
  { code: 'SWE', weight: 2, first: ['Erik', 'Johan', 'Anders', 'Fredrik', 'Mattias', 'Oskar', 'Viktor', 'Emil'], firstF: ['Emma', 'Linnea', 'Frida', 'Sofia', 'Maja', 'Elin'], last: ['Andersson', 'Karlsson', 'Eriksson', 'Lindgren', 'Nyström', 'Holm', 'Sandberg', 'Ekström'] },
  { code: 'VIE', weight: 2, first: ['Minh', 'Duc', 'Hieu', 'Quang', 'Tuan', 'Khoa', 'Long', 'Nam'], firstF: ['Linh', 'Mai', 'Thu', 'Lan', 'Huong', 'Trang'], last: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Dang', 'Bui', 'Vu'] },
  { code: 'BRA', weight: 2, first: ['Rafael', 'Thiago', 'Gustavo', 'Leandro', 'Rodrigo', 'Caio', 'Felipe', 'Bruno'], firstF: ['Mariana', 'Beatriz', 'Camila', 'Larissa', 'Juliana', 'Fernanda'], last: ['Silva', 'Souza', 'Oliveira', 'Pereira', 'Carvalho', 'Ribeiro', 'Almeida', 'Barbosa'] },
];

const TOTAL_WEIGHT = NATIONS.reduce((a, n) => a + n.weight, 0);

export interface ForeignName {
  name: string;
  nat: string;
}

/** Losuje zagranicznego zawodnika (kraj z wagami, imię i nazwisko z list kraju). */
export function foreignName(rng: Rng, female: boolean): ForeignName {
  let x = rng.float() * TOTAL_WEIGHT;
  let nation = NATIONS[0]!;
  for (const n of NATIONS) {
    x -= n.weight;
    if (x <= 0) {
      nation = n;
      break;
    }
  }
  const first = rng.pick(female ? nation.firstF : nation.first);
  const last = rng.pick(female && nation.lastF ? nation.lastF : nation.last);
  return { name: `${first} ${last}`, nat: nation.code };
}

/** Szansa, że zawodnik o danym rankingu jest Polakiem: w niższych kategoriach niemal wszyscy, na szczycie nieliczni. */
export function polishShare(rating: number): number {
  if (rating < 1900) return 0.97;
  if (rating < 2300) return 0.97 - ((rating - 1900) / 400) * 0.42;
  if (rating < 2500) return 0.55 - ((rating - 2300) / 200) * 0.3;
  return 0.1;
}

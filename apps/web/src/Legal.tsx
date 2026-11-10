import { useState } from 'react';
import { Icon, XScroll } from './ui';
import { deleteMyData } from './api';
import { CONTACT_EMAIL, LAST_UPDATED, OPERATOR_NAME } from './legalConfig';

export type LegalSection = 'info' | 'privacy' | 'terms' | 'storage' | 'licenses';

const SECTIONS: [LegalSection, string][] = [
  ['info', 'Informacje prawne'],
  ['privacy', 'Polityka prywatności'],
  ['terms', 'Regulamin'],
  ['storage', 'Cookies i pamięć lokalna'],
  ['licenses', 'Licencje'],
];

/** Krótka stopka widoczna na każdym ekranie. */
export function Footer({ onLegal }: { onLegal: (s?: LegalSection) => void }) {
  return (
    <footer className="legal-footer">
      <p>
        Gra nieoficjalna i niepowiązana z FIDE, PZSzach ani żadną organizacją szachową, drużyną czy obiektem. Wszyscy gracze w grze są fikcyjni.
        Nazwy służą wyłącznie identyfikacji rzeczywistości sportowej.
      </p>
      <p className="lf-links">
        <button type="button" className="linklike" onClick={() => onLegal('info')}>Informacje prawne</button>
        <span aria-hidden="true">·</span>
        <button type="button" className="linklike" onClick={() => onLegal('privacy')}>Prywatność</button>
        <span aria-hidden="true">·</span>
        <button type="button" className="linklike" onClick={() => onLegal('terms')}>Regulamin</button>
        <span aria-hidden="true">·</span>
        <button type="button" className="linklike" onClick={() => onLegal('storage')}>Cookies</button>
        <span aria-hidden="true">·</span>
        <span>Symulator Szachisty &copy; {new Date().getFullYear()}</span>
      </p>
    </footer>
  );
}

function Contact() {
  if (!CONTACT_EMAIL && !OPERATOR_NAME) return null;
  return (
    <p>
      <b>Administrator serwisu:</b> {OPERATOR_NAME || 'właściciel serwisu'}
      {CONTACT_EMAIL && (
        <>
          , kontakt: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </>
      )}
      .
    </p>
  );
}

function Info() {
  return (
    <>
      <h3>Charakter gry</h3>
      <p>
        Symulator Szachisty (Kariera Szachisty) to nieoficjalna gra rozrywkowa o karierze szachowej. Nie jest produktem, usługą ani
        publikacją żadnej organizacji szachowej. Wyniki partii i turniejów są wyliczane przez symulację i nie odzwierciedlają
        prawdziwych zawodów ani prawdziwych zawodników.
      </p>
      <h3>Brak powiązań</h3>
      <p>
        Projekt jest niezależny. Nie jest powiązany, sponsorowany, zatwierdzony ani wspierany przez Międzynarodową Federację Szachową
        (FIDE), Polski Związek Szachowy (PZSzach), inne federacje, organizatorów turniejów, kluby, drużyny, obiekty, sponsorów ani żadną
        inną organizację szachową.
      </p>
      <h3>Nazwy i znaki towarowe</h3>
      <p>
        Nazwy organizacji, turniejów, miast, tytułów, kategorii i regulaminów (np. FIDE, PZSzach, tytuły GM, IM, FM, CM, polskie
        kategorie szachowe, nazwy znanych turniejów) są użyte wyłącznie w celu identyfikacji rzeczywistości sportowej, którą gra
        przybliża. Nie oznaczają współpracy ani poparcia. Wszystkie nazwy, znaki towarowe i logotypy należą do ich właścicieli.
      </p>
      <p>
        Zasady kategorii, norm, tytułów i rankingów są uproszczone i wzorowane na rzeczywistych, na potrzeby gry. Mogą odbiegać od
        obowiązujących regulaminów i nie stanowią informacji oficjalnych. Wiążące są wyłącznie regulaminy właściwych organizacji.
      </p>
      <h3>Postacie fikcyjne</h3>
      <p>
        Wszyscy zawodnicy, trenerzy i kluby w grze są fikcyjni i generowani losowo z list imion i nazwisk. Każda zbieżność z prawdziwymi
        osobami, żyjącymi lub nie, oraz z prawdziwymi klubami jest przypadkowa.
      </p>
      <h3>Odpowiedzialność</h3>
      <p>
        Gra jest udostępniana w stanie, w jakim jest, bez gwarancji jakiegokolwiek rodzaju. Autor nie odpowiada za utratę zapisów,
        niedostępność serwera rankingów ani skutki korzystania z gry w zakresie dopuszczalnym przez prawo.
      </p>
      <Contact />
    </>
  );
}

function Privacy() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const del = async () => {
    if (!confirm('Usunąć z serwera wszystkie Twoje wyniki i anonimowe konto? Zapisy lokalne w przeglądarce zostają. Tej operacji nie można cofnąć.')) return;
    setBusy(true);
    try {
      const n = await deleteMyData();
      setMsg({ ok: true, text: n === null ? 'Ta przeglądarka nie ma konta w rankingu, więc nie ma czego usuwać.' : `Usunięto anonimowe konto i wyniki z serwera (kariery: ${n}).` });
    } catch {
      setMsg({ ok: false, text: 'Nie udało się połączyć z serwerem. Spróbuj ponownie później.' });
    }
    setBusy(false);
  };
  return (
    <>
      <p className="muted">Ostatnia aktualizacja: {LAST_UPDATED}.</p>
      <h3>Administrator</h3>
      <p>Administratorem danych przetwarzanych w trybie online jest właściciel serwisu, z którego korzystasz.</p>
      <Contact />
      <h3>Jakie dane przetwarzamy</h3>
      <ul>
        <li>
          <b>Tryb offline:</b> zapisy gry zostają wyłącznie w Twojej przeglądarce. Nic nie jest wysyłane na serwer.
        </li>
        <li>
          <b>Tryb online (ranking):</b> losowy identyfikator anonimowego konta, token zapisany w przeglądarce (na serwerze tylko jego skrót), imię postaci
          wpisane przez Ciebie, parametry startowe kariery (płeć, styl, miasto, debiut), wynik kariery (ranking, kategoria, punkty, liczba tygodni) oraz
          daty rozpoczęcia i zakończenia. Zapis wykonanych akcji jest wysyłany tylko po to, by serwer sprawdził wynik, i nie jest przechowywany.
        </li>
        <li>
          <b>Dane techniczne:</b> aplikacja serwera nie zapisuje adresów IP ani logów dostępu. Dostawca hostingu może gromadzić takie dane we własnych
          logach infrastruktury.
        </li>
      </ul>
      <p>Nie prosimy o imię i nazwisko, adres e-mail ani inne dane identyfikujące. Nie wpisuj ich jako imienia postaci: będzie ono widoczne publicznie w rankingu.</p>
      <h3>Cele i podstawy prawne</h3>
      <ul>
        <li>Prowadzenie rankingu i weryfikacja wyników: art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: uczciwy ranking) oraz, w zakresie udziału w rankingu na Twoje życzenie, lit. b.</li>
        <li>Zapobieganie nadużyciom i zapewnienie bezpieczeństwa serwisu: art. 6 ust. 1 lit. f RODO.</li>
      </ul>
      <p>Nie stosujemy profilowania, reklam, narzędzi analitycznych ani zautomatyzowanego podejmowania decyzji wobec Ciebie.</p>
      <h3>Odbiorcy i przekazywanie danych</h3>
      <p>
        Dane mogą być powierzone dostawcy hostingu, który obsługuje serwer. Serwis nie osadza zewnętrznych skryptów, czcionek ani innych treści
        stron trzecich. Czcionki są serwowane lokalnie.
      </p>
      <h3>Jak długo przechowujemy dane</h3>
      <p>Do czasu, gdy sam je usuniesz (przycisk poniżej) albo zażądasz usunięcia, oraz do czasu usunięcia wpisów naruszających regulamin.</p>
      <h3>Twoje prawa</h3>
      <p>
        Masz prawo dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania, sprzeciwu oraz wniesienia skargi do Prezesa Urzędu Ochrony
        Danych Osobowych. Ponieważ konto jest anonimowe, w kontakcie możemy poprosić o podanie imienia postaci i przybliżonej daty wyniku.
      </p>
      <p>
        <button type="button" onClick={del} disabled={busy}>Usuń moje wyniki i konto z serwera</button>
      </p>
      {msg && <p role="status" className={msg.ok ? 'good' : 'bad'}>{msg.text}</p>}
      <p className="muted">Usunięcie dotyczy konta powiązanego z tą przeglądarką. Wyniki zapisane z innych przeglądarek wymagają usunięcia z nich lub kontaktu z administratorem.</p>
      <h3>Dzieci</h3>
      <p>Gra nie jest kierowana do zbierania danych od dzieci. Osoby niepełnoletnie powinny korzystać z rankingu online za wiedzą opiekuna i nie wpisywać danych osobowych.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <p className="muted">Ostatnia aktualizacja: {LAST_UPDATED}.</p>
      <h3>1. Postanowienia ogólne</h3>
      <p>
        Gra „Symulator Szachisty” (Kariera Szachisty) jest bezpłatna i nie wymaga rejestracji. Korzystając z niej, akceptujesz ten regulamin. Gra ma charakter
        rozrywkowy i jest nieoficjalna (zob. Informacje prawne).
      </p>
      <h3>2. Zasady korzystania</h3>
      <ul>
        <li>Imię postaci jest widoczne publicznie w rankingu. Nie wpisuj w nim danych osobowych, adresów e-mail ani odnośników, a także treści obraźliwych, nienawistnych lub niezgodnych z prawem.</li>
        <li>Zabronione jest podszywanie się pod inne osoby, próby manipulowania rankingiem, obchodzenia weryfikacji wyników oraz zakłócania pracy serwisu.</li>
        <li>Wynik w rankingu jest weryfikowany przez serwer. Wpisy, które nie przejdą weryfikacji albo naruszają regulamin, mogą zostać odrzucone lub usunięte.</li>
      </ul>
      <h3>3. Ranking i konto anonimowe</h3>
      <p>Udział w rankingu online jest dobrowolny. Możesz grać offline, wtedy wynik nie trafia na serwer. Konto jest anonimowe i powiązane z przeglądarką; utrata danych przeglądarki oznacza utratę dostępu do konta.</p>
      <h3>4. Płatności i zwroty</h3>
      <p>Gra jest bezpłatna: nie oferuje płatności, subskrypcji ani zakupów w grze, więc nie przewiduje zwrotów.</p>
      <h3>5. Prawa autorskie</h3>
      <p>Gra, jej kod, teksty i grafiki są chronione prawem autorskim. Licencje elementów stron trzecich wskazano w zakładce Licencje. Zasady korzystania z kodu źródłowego określa repozytorium projektu.</p>
      <h3>6. Odpowiedzialność</h3>
      <p>Gra jest udostępniana bez gwarancji dostępności i bezbłędnego działania. W zakresie dopuszczalnym przez prawo autor nie odpowiada za utratę zapisów, przerwy w działaniu ani skutki korzystania z gry.</p>
      <h3>7. Zmiany i prawo</h3>
      <p>Regulamin może być zmieniany; aktualna wersja jest dostępna w grze. W sprawach nieuregulowanych stosuje się prawo polskie. Konsumentom przysługują uprawnienia wynikające z przepisów obowiązującego prawa.</p>
      <Contact />
    </>
  );
}

function Storage() {
  return (
    <>
      <p className="muted">Ostatnia aktualizacja: {LAST_UPDATED}.</p>
      <h3>Ciasteczka</h3>
      <p>Serwis nie używa plików cookie.</p>
      <h3>Pamięć lokalna przeglądarki (localStorage)</h3>
      <p>Gra zapisuje w Twojej przeglądarce wyłącznie dane niezbędne do działania, bez których usługa, o którą prosisz, nie może działać:</p>
      <XScroll label="Klucze pamięci lokalnej">
      <table className="nowrap-table">
        <thead><tr><th>Klucz</th><th>Do czego służy</th></tr></thead>
        <tbody>
          <tr><td><code>szachy-save-v2-slot0..2</code></td><td>zapisy karier (trzy sloty)</td></tr>
          <tr><td><code>szachy-token</code></td><td>anonimowy token konta rankingu (tylko w trybie online)</td></tr>
          <tr><td><code>szachy-pending-results</code></td><td>wynik czekający na wysłanie do rankingu, gdy serwer był niedostępny</td></tr>
        </tbody>
      </table>
      </XScroll>
      <p>
        Ponieważ jest to pamięć wyłącznie niezbędna, a serwis nie używa analityki, reklam ani zewnętrznych osadzeń, nie wymaga zgody w formie banera. Dane możesz w dowolnej chwili
        usunąć w ustawieniach przeglądarki albo kasując zapisy w grze.
      </p>
      <h3>Usługi stron trzecich</h3>
      <p>Serwis nie ładuje zasobów z zewnętrznych serwerów: czcionki i grafiki są serwowane lokalnie, nie ma osadzonych filmów, map ani widżetów.</p>
    </>
  );
}

function Licenses() {
  return (
    <>
      <p>Gra korzysta z następujących elementów stron trzecich:</p>
      <ul>
        <li>Czcionki Fira Sans, Fira Code i Fraunces: licencja SIL Open Font License 1.1 (serwowane lokalnie z pakietów Fontsource).</li>
        <li>Ikony w stylu Lucide: licencja ISC.</li>
        <li>Biblioteki: React, zustand, Vite, Fastify, zod (licencja MIT), chess.js (licencja BSD-2-Clause).</li>
      </ul>
      <p>Zrzuty ekranu i pozostałe grafiki gry są wykonane na potrzeby projektu, nie zawierają zewnętrznych zdjęć ani logotypów organizacji.</p>
    </>
  );
}

/** Strony prawne: informacje, polityka prywatności, regulamin, cookies, licencje. */
export function Legal({ onBack, initial = 'info' }: { onBack: () => void; initial?: LegalSection }) {
  const [section, setSection] = useState<LegalSection>(initial);
  return (
    <div className="panel legal">
      <h2><Icon name="flag" /> {SECTIONS.find(([k]) => k === section)![1]}</h2>
      <nav className="legal-nav" aria-label="Strony prawne">
        {SECTIONS.map(([k, label]) => (
          <button key={k} type="button" className={section === k ? 'small' : 'ghost small'} aria-current={section === k ? 'page' : undefined} onClick={() => setSection(k)}>{label}</button>
        ))}
      </nav>
      {section === 'info' && <Info />}
      {section === 'privacy' && <Privacy />}
      {section === 'terms' && <Terms />}
      {section === 'storage' && <Storage />}
      {section === 'licenses' && <Licenses />}
      <div className="row">
        <button onClick={onBack}>Wróć do gry</button>
      </div>
    </div>
  );
}

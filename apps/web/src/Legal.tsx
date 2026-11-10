import { Icon } from './ui';

/** Krótka stopka widoczna na każdym ekranie. */
export function Footer({ onLegal }: { onLegal: () => void }) {
  return (
    <footer className="legal-footer">
      <p>
        Gra nieoficjalna i niepowiązana z FIDE, PZSzach ani żadną organizacją szachową, drużyną czy obiektem. Wszyscy gracze w grze są fikcyjni.
        Nazwy służą wyłącznie identyfikacji rzeczywistości sportowej.
      </p>
      <p>
        <button type="button" className="linklike" onClick={onLegal}>Informacje prawne i prywatność</button>
        <span aria-hidden="true"> · </span>
        <span>Symulator Szachisty &copy; {new Date().getFullYear()}</span>
      </p>
    </footer>
  );
}

/** Pełna strona informacji prawnych: charakter gry, znaki towarowe, postacie fikcyjne, prywatność, odpowiedzialność. */
export function Legal({ onBack }: { onBack: () => void }) {
  return (
    <div className="panel legal">
      <h2><Icon name="flag" /> Informacje prawne</h2>

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
        Zasady kategorii, norm, tytułów i rankingów są uproszczone na potrzeby gry i mogą odbiegać od obowiązujących regulaminów.
        Nie stanowią informacji oficjalnych. Wiążące są wyłącznie regulaminy właściwych organizacji.
      </p>

      <h3>Postacie fikcyjne</h3>
      <p>
        Wszyscy zawodnicy, trenerzy i kluby w grze są fikcyjni i generowani losowo z list imion i nazwisk. Każda zbieżność z prawdziwymi
        osobami, żyjącymi lub nie, oraz z prawdziwymi klubami jest przypadkowa.
      </p>

      <h3>Dane i prywatność</h3>
      <ul>
        <li>Zapisy gry (do trzech karier) są przechowywane lokalnie w Twojej przeglądarce (localStorage). Usunięcie danych witryny w przeglądarce usuwa zapisy.</li>
        <li>Gra nie używa ciasteczek reklamowych ani narzędzi analitycznych.</li>
        <li>
          Jeśli serwer rankingów jest dostępny, gra tworzy anonimowe konto (losowy identyfikator i token zapisany w przeglądarce)
          i po zakończeniu kariery wysyła na serwer wpisane imię postaci, wynik oraz zapis wykonanych akcji, aby serwer mógł zweryfikować
          wynik. Imię postaci jest wyświetlane publicznie w rankingach. Nie wpisuj w nim danych osobowych.
        </li>
        <li>Wyniki raz wysłane do rankingu nie znikają po usunięciu zapisu lokalnego.</li>
        <li>Czcionki są ładowane z usługi Google Fonts, co ujawnia jej operatorowi adres IP odwiedzającego.</li>
      </ul>

      <h3>Odpowiedzialność</h3>
      <p>
        Gra jest udostępniana w stanie, w jakim jest, bez gwarancji jakiegokolwiek rodzaju. Autor nie odpowiada za utratę zapisów,
        niedostępność serwera rankingów ani skutki korzystania z gry.
      </p>

      <div className="row">
        <button onClick={onBack}>Wróć do gry</button>
      </div>
    </div>
  );
}

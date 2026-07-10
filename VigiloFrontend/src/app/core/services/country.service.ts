// country.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';
import { Country } from '../models/Country.model';

@Injectable({ providedIn: 'root' })
export class CountryService {
  private http = inject(HttpClient);
  private apiUrl = 'https://restcountries.com/v3.1/all?fields=name,cca2,flags,continents';

  // On utilise shareReplay pour éviter de refaire la requête HTTP
  // si plusieurs composants s'abonnent en même temps
  private countries$ = this.http.get<any[]>(this.apiUrl).pipe(
    map((data) =>
      data.map((c) => ({
        name: c.name.translations?.fra?.common || c.name.common, // Nom en français si possible
        code: c.cca2,
        flag: c.flags.svg,
        continent: c.continents[0],
      })),
    ),
    map((countries) => countries.sort((a, b) => a.name.localeCompare(b.name))),
    shareReplay(1),
  );

  getCountries(): Observable<Country[]> {
    return this.countries$;
  }
}

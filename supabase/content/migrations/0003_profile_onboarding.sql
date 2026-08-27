-- Onboarding fields ported from store.js's `account` object
-- (milestone, countriesVisited, tripTypes, hasBookedTrip) — collected
-- during onboarding but not otherwise read by app logic, same as
-- today; kept on the profile so a real account persists them.
alter table profiles
  add column onboarded boolean not null default false,
  add column countries_visited text[] not null default '{}',
  add column trip_types text[] not null default '{}',
  add column has_booked_trip boolean;

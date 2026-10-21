-- Give the winter lessons, the freeride week and the transfer their own
-- "what's included" lists. Until now these were empty in the database, so the
-- site showed generic defaults (hotel, lift pass, Tbilisi transfer) that do not
-- apply to a lesson or a transfer.
-- Run once in the Supabase SQL editor. Safe to run again: it only sets these
-- three lists, by trip address, and touches nothing else.

update public.tours set
  included = '[["Certified instructor","Ski or snowboard, private or small group"],["The lesson time","Two hours on the slope you are already on"],["Lesson plan for your level","Built around what you can do and what you want to work on"]]'::jsonb,
  excluded = '[["Lift pass","Buy one at the ticket office for the days you ride"],["Equipment rental","Skis or board, boots and helmet, hired in resort"],["Travel insurance","Recommended, and required for off-piste lessons"],["Getting to Gudauri","Transfers are booked separately"]]'::jsonb
  where slug = 'gudauri-lessons';

update public.tours set
  included = '[["Freeride guide","Certified, leads every riding day"],["Avalanche safety session","Day one: transceiver and companion rescue"],["Avalanche kit","Transceiver, probe and shovel on every off-piste day"],["Accommodation","Five nights in a Gudauri hotel, breakfast included"],["Lift pass","For all six riding days"],["Transfer","Minibus Tbilisi – Gudauri – Tbilisi"]]'::jsonb,
  excluded = '[["Equipment rental","Skis or board, boots and helmet, hired in resort"],["Travel insurance","Must cover off-piste riding and rescue"],["Lunches and dinners","Mountain restaurants, your choice"],["Cat or heli day","Optional add-on, priced on the day and weather-dependent"]]'::jsonb
  where slug = 'gudauri-freeride';

update public.tours set
  included = '[["Driver","Local, English-speaking where asked for"],["Vehicle","Sedan or minibus, sized to the group and the luggage"],["Fuel and tolls","All included in the price"],["Waiting time","Included for a normal pickup, such as after a landing"]]'::jsonb,
  excluded = '[["Meals and drinks","Not included on the way"],["Extra stops","Chargeable if they add time"],["Overnight waiting","Charged if a flight is delayed to the next day"]]'::jsonb
  where slug = 'tbilisi-transfer';

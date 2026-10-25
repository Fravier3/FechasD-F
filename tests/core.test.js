import test from 'node:test';
import assert from 'node:assert/strict';
import {validDate,eventsOnDate,monthCells,daysBetween,prettyRange,validateEvent,recurrenceInfo} from '../core.js';
test('los rangos de viaje cubren ambos años y sus extremos',()=>{
 const visit={start_date:'2025-12-28',end_date:'2026-01-04',annual:false};
 for(const day of ['2025-12-28','2025-12-31','2026-01-01','2026-01-04'])assert.equal(eventsOnDate([visit],day).length,1);
 for(const day of ['2025-12-27','2026-01-05','2026-12-28'])assert.equal(eventsOnDate([visit],day).length,0);
});
test('el aniversario se repite sin inventar eventos anteriores',()=>{
 const event={start_date:'2025-06-08',annual:true};
 assert.equal(eventsOnDate([event],'2025-06-08').length,1);
 assert.equal(eventsOnDate([event],'2027-06-08').length,1);
 assert.equal(eventsOnDate([event],'2024-06-08').length,0);
});
test('rechaza fechas imposibles y rangos invertidos',()=>{
 assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2024-02-29'),true);
 assert.ok(validateEvent({title:'Viaje',start_date:'2026-06-12',end_date:'2026-06-05'}));
 assert.equal(validateEvent({title:'Viaje',start_date:'2026-06-05',end_date:'2026-06-12'}),'');
});
test('el calendario empieza en lunes, incluye todos los días y no cambia con horario de verano',()=>{
 const cells=monthCells(2026,1);assert.equal(cells[0],'2026-01-26');assert.ok(cells.includes('2026-02-28'));assert.equal(cells.length%7,0);
 assert.equal(daysBetween('2026-03-07','2026-03-09'),2);
});
test('el rango conserva los años correctos',()=>{const value=prettyRange('2025-12-28','2026-01-04');assert.match(value.main,/2025/);assert.match(value.main,/2026/);assert.equal(value.year,'');});
test('aclara 2025 en junio 2026 y en años posteriores sin alterar el evento',()=>{
 const event={start_date:'2025-06-08',annual:true},original=JSON.stringify(event);
 for(const iso of ['2026-06-08','2027-06-08','2030-06-08'])assert.equal(recurrenceInfo(event,iso).note,'Este recuerdo ocurrió originalmente en 2025. Lo recordamos cada año en esta fecha.');
 assert.equal(recurrenceInfo(event,'2025-06-08').note,'');assert.equal(recurrenceInfo(event,'2024-06-08').note,'');assert.equal(JSON.stringify(event),original);
});
test('el viaje de 2026 no recibe una aclaración de aniversario',()=>{
 const trip={start_date:'2026-06-05',end_date:'2026-06-12',annual:false};
 assert.equal(recurrenceInfo(trip,'2026-06-05').year,2026);assert.equal(recurrenceInfo(trip,'2026-06-05').note,'');assert.equal(eventsOnDate([trip],'2027-06-05').length,0);
});
test('nuevos aniversarios y cumpleaños usan su año original',()=>{
 assert.match(recurrenceInfo({start_date:'2030-12-10',annual:true},'2031-12-10').note,/2030/);
 assert.equal(recurrenceInfo({start_date:'2030-12-10',annual:true},'2031-12-11').note,'');
 assert.match(recurrenceInfo({start_date:'1997-07-27',annual:true,detailId:'birthday'},'2026-07-27').note,/Nació en 1997/);
});

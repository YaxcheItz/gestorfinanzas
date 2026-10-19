import {test} from 'node:test';
import assert from 'node:assert/strict';
import {importRow} from '../src/migration.mjs';
const row = {key:'810e49aa-6420-5e5b-b13a-58cd346c10c6',source:'whatsapp-chat',state:'pending',payload:'{"note":"saldo"}',replied:1,received_at:0};
test('frozen duplicate proposal preserves original date, amount and account',()=>{
  const proposal={cuentaId:10,tipo:'GASTO',monto:'25.00',fecha:'2026-10-17',_currency:'MXN'};
  const result=importRow({...row,payload:JSON.stringify(proposal)});
  assert.equal(result.stage,'ready');assert.deepEqual(result.data.candidate,proposal);assert.equal(row.key,'810e49aa-6420-5e5b-b13a-58cd346c10c6');
});
test('audio keeps its expiry and must still be explicitly confirmed',()=>{
  const result=importRow({...row,source:'whatsapp-audio',state:'answered',payload:JSON.stringify({transcript:'cafe 25',expires:12345})});
  assert.equal(result.stage,'audio_review');assert.equal(result.data.audioExpires,12345);
});
test('legacy unknown media stays manual and codex requests never become financial inputs',()=>{
  assert.equal(importRow({...row,source:'whatsapp'}).stage,'manual');
  assert.equal(importRow({...row,source:'codex'}).stage,'answered');
});
test('foreign sources and malformed metadata are rejected',()=>{
  assert.throws(()=>importRow({...row,source:'gmail-bank'}));
  assert.throws(()=>importRow({...row,key:"x'; DELETE FROM events;"}));
  assert.throws(()=>importRow({...row,replied:5}));
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /data-action="redeem" data-id="\$\{r\.id\}/, 'el botón infantil conserva rewardId');
assert.match(html, /if\(action==='redeem'\)\{/, 'el listener delegado atiende canjes');
assert.match(html, /tablonRemoteCall\('requestRedemption',item\)/, 'el botón llama requestRedemption');
assert.match(html, /httpsCallable\(functionsClient,name\)\(\{rewardId:item\.id,eventId\}\)/, 'la callable usa rewardId y eventId');
assert.match(html, /functions\.getFunctions\(app,'europe-west1'\)/, 'la callable usa europe-west1');
assert.match(html, /redeemBusy\(b,true\)/, 'el botón muestra estado de carga');
assert.match(html, /redeemBusy\(b,false\)/, 'el botón se restaura tras acabar');
assert.match(html, /No se ha encontrado el premio|Este premio no tiene identificador/, 'rewardId ausente muestra error');
assert.match(html, /error\?\.message\|\|['"]No se pudo pedir el canje\./, 'fallo callable muestra el error');
assert.match(html, /Canje pendiente de validación\./, 'éxito deja feedback pending');
assert.match(html, /status='pending'/, 'la vista representa pending');
const requestSection = html.slice(html.indexOf("if(action==='redeem')"), html.indexOf("if(action==='validate'"));
assert.doesNotMatch(requestSection, /points\s*-=/, 'pedir canje no gasta saldo');
assert.match(html, /state\.children\[item\.child\]\.points-=item\.cost/, 'el gasto queda reservado a validar un canje');
assert.match(html, /document\.addEventListener\('click'/, 'listener delegado sobrevive a render y onSnapshot');
console.log('redemption UI regression: ok');

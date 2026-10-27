import test from 'node:test';
import assert from 'node:assert/strict';
import {administratorDashboardUrl} from '../web/src/admin-menu.js';
test('only a configured principal sees a valid dashboard link',()=>{
 const c={enabled:true,principals:['admin-principal'],dashboardUrl:'https://admin.account.workers.dev/'};
 assert.equal(administratorDashboardUrl('admin-principal',c),'https://admin.account.workers.dev/');
 assert.equal(administratorDashboardUrl('ordinary-user',c),'');
 assert.equal(administratorDashboardUrl('',c),'');
 assert.equal(administratorDashboardUrl('admin-principal',{...c,enabled:false}),'');
 assert.equal(administratorDashboardUrl('admin-principal',{...c,dashboardUrl:'https://evil.example/'}),'');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {publicHttps,extract} from './community-discover.mjs';
test('rejects unsafe URLs',()=>{for(const u of ['http://app.example.com','https://127.0.0.1/','https://localhost/','https://test.local/','javascript:alert(1)'])assert.equal(publicHttps(u),'')});
test('public metadata remains pending review regardless of hosting provider',()=>{const html='<title>My game</title><meta name="description" content="A fun public app"><link rel="icon" href="/favicon.ico">';for(const host of ['game.example.com','example.org']){const a=extract(html,`https://${host}/`);assert.equal(a.reviewStatus,'pending');assert.equal(a.discoverySource,'community');assert.equal(a.logoUrl,`https://${host}/favicon.ico`);assert.deepEqual(a.evidence,['configured_public_url']);assert.equal(Object.hasOwn(a,'builder'),false)}});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasLiveLegacyDrafts} from '../src/migration.mjs';

test('switching mode cannot silently abandon a live clarification or audio',()=>{
 assert.equal(hasLiveLegacyDrafts({expires:101},[],100),true);
 assert.equal(hasLiveLegacyDrafts(null,[{audioExpires:101}],100),true);
 assert.equal(hasLiveLegacyDrafts({expires:100},[{audioExpires:99}],100),false);
 assert.equal(hasLiveLegacyDrafts(null,[],100),false);
});

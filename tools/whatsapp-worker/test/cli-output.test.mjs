import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCliJson} from '../src/cli-output.mjs';

test('Wrangler output accepts JSON with upload progress but never evaluates text',()=>{
  assert.deepEqual(parseCliJson('[{"results":[]}]'),[{results:[]}]);
  assert.deepEqual(parseCliJson('├ Upload complete\n[\n {"results":[{"paused":1}]}\n]\n'),[{results:[{paused:1}]}]);
  assert.deepEqual(parseCliJson('{"loggedIn":true}\n'),{loggedIn:true});
  assert.throws(()=>parseCliJson('progress only; execute anything'));
});

import assert from 'node:assert/strict';
import { isValidHexColor, isValidImageUrl } from './theme-validation';

assert.equal(isValidHexColor('#E8231A'), true);
assert.equal(isValidHexColor('#fff'), true);
assert.equal(isValidHexColor('red'), false);
assert.equal(isValidImageUrl('https://example.com/image.jpg'), true);
assert.equal(isValidImageUrl('/uploads/image.jpg'), true);
assert.equal(isValidImageUrl('javascript:alert(1)'), false);

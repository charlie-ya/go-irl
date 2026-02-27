import { isPointInExcludedZone, STATIC_ZONES } from './src/lib/exclusionZones';

// Test 1: Inside Sacred Zone (Point)
// Center: 32.0929, 34.7817
// Radius: 20m
const insideSacred = { lat: 32.0929, lng: 34.7817 }; // Dead center
const justInsideSacred = { lat: 32.09291, lng: 34.7817 }; // ~1m north
const outsideSacred = { lat: 32.0932, lng: 34.7817 }; // ~33m north (should be outside)

console.log('--- Sacred Zone Test ---');
console.log('Inside (Center):', isPointInExcludedZone(insideSacred.lat, insideSacred.lng) ? 'PASS' : 'FAIL');
console.log('Inside (Edge):', isPointInExcludedZone(justInsideSacred.lat, justInsideSacred.lng) ? 'PASS' : 'FAIL');
console.log('Outside:', !isPointInExcludedZone(outsideSacred.lat, outsideSacred.lng) ? 'PASS' : 'FAIL');

console.log('\n--- Done ---');

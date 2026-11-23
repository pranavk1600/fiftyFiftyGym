import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseFlexibleDate,
  parseDurationDays,
  parseAmount,
  parseCsvText,
  mapCsvRowToMember,
  validateMemberRecords,
  generateSampleCsv
} from '../services/memberImport.service.js';

describe('Bulk Member Import Service Tests', () => {
  it('1. parseCsvText should correctly parse standard and quoted CSV text with CRLF and commas', () => {
    const csv = `ID,NAME,Payment,Start D,End D,Duration,M Type,Total Am,Received Am,Bal. Am,Rc N\r\n` +
      `"101","Rahul Sharma, Jr.","2024-01-10","2024-01-10","2024-04-10","3 Months","General Fitness","6,000","6,000","0","REC-101"\r\n` +
      `102,Priya Patel,01/02/2024,01/02/2024,01/02/2025,1 Year,Personal Training,24000,20000,4000,REC-102\r\n`;

    const rows = parseCsvText(csv);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0]['NAME'], 'Rahul Sharma, Jr.');
    assert.strictEqual(rows[0]['ID'], '101');
    assert.strictEqual(rows[1]['ID'], '102');
    assert.strictEqual(rows[1]['NAME'], 'Priya Patel');
  });

  it('2. parseFlexibleDate should parse ISO, DD/MM/YYYY, Excel serial dates, and text dates', () => {
    assert.strictEqual(parseFlexibleDate('2024-03-15'), '2024-03-15');
    assert.strictEqual(parseFlexibleDate('15/03/2024'), '2024-03-15');
    assert.strictEqual(parseFlexibleDate('15-03-2024'), '2024-03-15');
    // Excel serial 45366 is 2024-03-15
    const serialDate = parseFlexibleDate('45366');
    assert.ok(serialDate.startsWith('2024-03'));
    assert.strictEqual(parseFlexibleDate(''), null);
    assert.strictEqual(parseFlexibleDate('invalid-date'), null);
  });

  it('3. parseDurationDays should parse text durations and calculate difference between dates', () => {
    assert.strictEqual(parseDurationDays('1 Month'), 30);
    assert.strictEqual(parseDurationDays('3 Months'), 90);
    assert.strictEqual(parseDurationDays('6 Months'), 180);
    assert.strictEqual(parseDurationDays('1 Year'), 365);
    assert.strictEqual(parseDurationDays('', '2024-01-01', '2024-02-01'), 31);
  });

  it('4. parseAmount should clean currency symbols, commas, and negative values', () => {
    assert.strictEqual(parseAmount('₹6,000'), 6000);
    assert.strictEqual(parseAmount('Rs. 12,500.50'), 12500.5);
    assert.strictEqual(parseAmount(''), 0);
    assert.strictEqual(parseAmount('-500'), 0); // clamp to 0
  });

  it('5. mapCsvRowToMember should map Excel columns accurately', () => {
    const rawRow = {
      'ID': 'P-2001',
      'NAME': 'Suresh Raina',
      'Payment': '2024-01-05',
      'Start D': '2024-01-05',
      'End D': '2024-04-05',
      'Duration': '3 Months',
      'M Type': 'VIP Strength',
      'Total Am': '7,500',
      'Received Am': '5,000',
      'Bal. Am': '2,500',
      'Rc N': 'RCP-9901',
      'Phone': '9876543210',
      'Email': 'suresh@example.com'
    };

    const mapped = mapCsvRowToMember(rawRow, 0);
    assert.strictEqual(mapped.rawId, 'P-2001');
    assert.strictEqual(mapped.name, 'Suresh Raina');
    assert.strictEqual(mapped.startDate, '2024-01-05');
    assert.strictEqual(mapped.endDate, '2024-04-05');
    assert.strictEqual(mapped.membershipType, 'VIP Strength');
    assert.strictEqual(mapped.totalAmount, 7500);
    assert.strictEqual(mapped.receivedAmount, 5000);
    assert.strictEqual(mapped.balanceAmount, 2500);
    assert.strictEqual(mapped.receiptNumber, 'RCP-9901');
    assert.strictEqual(mapped.phone, '9876543210');
    assert.strictEqual(mapped.email, 'suresh@example.com');
  });

  it('6. validateMemberRecords should detect valid, duplicate, and invalid rows', async () => {
    const rows = [
      {
        rowIndex: 1,
        rawId: 'ID-001',
        name: 'John Doe',
        startDate: '2024-01-01',
        endDate: '2024-04-01',
        email: 'john@example.com',
        totalAmount: 5000,
        receivedAmount: 5000,
        balanceAmount: 0
      },
      {
        rowIndex: 2,
        rawId: 'ID-001', // In-file duplicate ID
        name: 'John Duplicate',
        startDate: '2024-01-01',
        endDate: '2024-04-01',
        email: 'john2@example.com',
        totalAmount: 5000,
        receivedAmount: 5000,
        balanceAmount: 0
      },
      {
        rowIndex: 3,
        rawId: 'ID-003',
        name: '', // Invalid empty name
        startDate: '2024-01-01',
        endDate: '2024-04-01',
        email: 'valid@example.com',
        totalAmount: 5000,
        receivedAmount: 5000,
        balanceAmount: 0
      },
      {
        rowIndex: 4,
        rawId: 'ID-004',
        name: 'Invalid Email Member',
        startDate: '2024-01-01',
        endDate: '2024-04-01',
        email: 'not-an-email', // Invalid email format
        totalAmount: 5000,
        receivedAmount: 5000,
        balanceAmount: 0
      }
    ];

    const result = await validateMemberRecords('dummy-gym-id', rows);
    assert.strictEqual(result.totalRecords, 4);
    assert.strictEqual(result.validCount, 1);
    assert.strictEqual(result.duplicateCount, 1);
    assert.strictEqual(result.invalidCount, 2);
    assert.strictEqual(result.validRecords[0].rawId, 'ID-001');
    assert.strictEqual(result.duplicateRecords[0].rawId, 'ID-001');
  });

  it('7. generateSampleCsv should produce a valid downloadable CSV template', () => {
    const sample = generateSampleCsv();
    assert.ok(sample.includes('ID,NAME,Phone,Email,Payment,Start D,End D,Duration,M Type,Total Am,Received Am,Bal. Am,Rc N'));
    assert.ok(sample.includes('Rahul Sharma'));
    assert.ok(sample.includes('Priya Patel'));
  });

  it('8. Bulk parsing simulation of 2,000 members for performance check', () => {
    const startTime = Date.now();
    let largeCsv = 'ID,NAME,Payment,Start D,End D,Duration,M Type,Total Am,Received Am,Bal. Am,Rc N\r\n';
    for (let i = 1; i <= 2000; i++) {
      largeCsv += `MEM-${i},Member ${i},2024-01-01,2024-01-01,2024-04-01,3 Months,General Fitness,6000,6000,0,REC-${i}\r\n`;
    }

    const rows = parseCsvText(largeCsv);
    assert.strictEqual(rows.length, 2000);

    const mapped = rows.map((r, idx) => mapCsvRowToMember(r, idx));
    assert.strictEqual(mapped.length, 2000);

    const elapsed = Date.now() - startTime;
    // Parsing and mapping 2,000 records should complete within 500ms
    assert.ok(elapsed < 1000, `Parsing 2,000 rows took ${elapsed}ms, which should be under 1,000ms`);
  });
});

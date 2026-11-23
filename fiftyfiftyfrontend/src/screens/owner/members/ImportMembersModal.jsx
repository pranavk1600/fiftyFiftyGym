import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Trash2,
  Info,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { apiClient } from '../../../shared/services/apiClient';
import { useToast } from '../../../context/ToastContext';

const SAMPLE_CSV_CONTENT = `ID,NAME,Phone,Email,Payment,Start D,End D,Duration,M Type,Total Am,Received Am,Bal. Am,Rc N\r\n` +
  `101,Rahul Sharma,9876543210,rahul.sharma@example.com,2024-01-10,2024-01-10,2024-04-10,3 Months,General Fitness,6000,6000,0,REC-1001\r\n` +
  `102,Priya Patel,9823456789,priya.patel@example.com,2024-02-01,2024-02-01,2025-02-01,1 Year,Personal Training,24000,20000,4000,REC-1002\r\n` +
  `103,Amit Verma,9812345678,amit.verma@example.com,2024-03-05,2024-03-05,2024-04-05,1 Month,Strength & Cardio,2500,2500,0,REC-1003\r\n` +
  `104,Sneha Kulkarni,9890123456,,2024-01-15,2024-01-15,2024-07-15,6 Months,General Fitness,11000,11000,0,REC-1004\r\n` +
  `105,Vikas Deshmukh,9871234560,vikas.d@example.com,2024-02-20,2024-02-20,2024-05-20,3 Months,Crossfit & Cardio,7500,5000,2500,REC-1005`;

export const ImportMembersModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      // Try fetching from backend route first
      const response = await apiClient.get('/members/sample-csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members_sample_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (_err) {
      // Local fallback blob
      const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'members_sample_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
    showToast('Sample CSV template downloaded.', 'info');
  };

  // Handle file selection
  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please select a valid CSV (.csv) file.', 'warning');
      return;
    }

    setSelectedFile(file);
    setValidationResult(null);
    setImportSummary(null);
    setIsValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/members/import-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = res.data?.data || res.data;
      setValidationResult(data);
      showToast(`Analyzed ${data.totalRecords || 0} records from CSV.`, 'info');
    } catch (err) {
      console.error('[CSV Preview Error]:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to parse CSV file.', 'danger');
      setSelectedFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportSummary(null);
    setShowErrorDetails(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    if (!validationResult || validationResult.validCount === 0) {
      showToast('No valid members to import.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      const payload = {
        members: validationResult.validRecords
      };

      const res = await apiClient.post('/members/bulk-import', payload);
      const result = res.data?.data || res.data;
      setImportSummary(result);
      showToast(`Successfully imported ${result.importedCount || 0} members!`, 'success');
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('[Bulk Import Error]:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to complete bulk import.', 'danger');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseModal = () => {
    handleClearFile();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="Bulk Import Members from Excel / CSV"
      maxWidth={920}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Top Info Banner */}
        <div style={{
          background: 'var(--bg-surface-elevated, rgba(255, 107, 0, 0.04))',
          border: '1px solid var(--border-subtle, rgba(255, 107, 0, 0.2))',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
            <Info size={18} style={{ color: 'var(--brand-primary, #FF6B00)', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Import existing members with historical payment dates, plans, and receipts without sending automated emails or marking check-in.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadTemplate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <Download size={14} />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* If Import Completed Successfully */}
        {importSummary ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 20px',
            background: 'rgba(16, 185, 129, 0.05)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 12
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#10B981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Check size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Bulk Import Completed!
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 520, margin: '0 auto 20px' }}>
              Your existing gym member database has been safely imported into FiftyFifty Gym.
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 24
            }}>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '12px 20px',
                minWidth: 140
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10B981' }}>
                  {importSummary.importedCount || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Members Imported</div>
              </div>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '12px 20px',
                minWidth: 140
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F59E0B' }}>
                  {importSummary.duplicateCount || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duplicates Skipped</div>
              </div>
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '12px 20px',
                minWidth: 140
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EF4444' }}>
                  {importSummary.errorCount || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Errors Skipped</div>
              </div>
            </div>

            <Button onClick={handleCloseModal}>
              <CheckCircle2 size={16} />
              <span>Done & Refresh Members List</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Dropzone / File Picker */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? 'var(--brand-primary, #FF6B00)' : 'var(--border-subtle, #333)'}`,
                  borderRadius: 12,
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragActive ? 'rgba(255, 107, 0, 0.05)' : 'var(--bg-surface, #1e1e24)',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(255, 107, 0, 0.1)',
                  color: 'var(--brand-primary, #FF6B00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Upload size={24} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Choose CSV file or drag & drop here
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto' }}>
                  Export your existing member spreadsheet from Excel as <strong>CSV format</strong> (UTF-8) and upload it here.
                </p>
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Supports up to 50,000 records (up to 10 MB)
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileSpreadsheet size={28} style={{ color: 'var(--brand-primary)' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB • CSV Spreadsheet
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearFile}
                  disabled={isValidating || isImporting}
                  style={{ color: 'var(--color-danger, #EF4444)' }}
                  title="Remove file"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              </div>
            )}

            {/* Validation in progress spinner */}
            {isValidating && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <RefreshCw size={28} className="spin" style={{ color: 'var(--brand-primary)', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Analyzing and validating CSV records...</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Checking date formats, amounts, and duplicate member IDs</div>
              </div>
            )}

            {/* Validation Results Overview */}
            {validationResult && !isValidating && (
              <>
                {/* Stats Counters */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12
                }}>
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Total in CSV
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {validationResult.totalRecords}
                    </div>
                  </div>

                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 600 }}>
                      Ready to Import
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10B981' }}>
                      {validationResult.validCount}
                    </div>
                  </div>

                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#F59E0B', textTransform: 'uppercase', fontWeight: 600 }}>
                      Duplicates (Skip)
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F59E0B' }}>
                      {validationResult.duplicateCount}
                    </div>
                  </div>

                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#EF4444', textTransform: 'uppercase', fontWeight: 600 }}>
                      Invalid / Errors
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EF4444' }}>
                      {validationResult.invalidCount}
                    </div>
                  </div>
                </div>

                {/* Warnings / Errors Accordion if duplicates or invalid rows */}
                {(validationResult.duplicateCount > 0 || validationResult.invalidCount > 0) && (
                  <div style={{
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={15} style={{ color: '#F59E0B' }} />
                        {validationResult.invalidCount + validationResult.duplicateCount} rows require attention (will be skipped safely)
                      </span>
                      {showErrorDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showErrorDetails && (
                      <div style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        padding: '10px 14px',
                        background: 'var(--bg-surface)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        {validationResult.invalidRecords?.map((inv, i) => (
                          <div key={`inv-${i}`} style={{ color: '#EF4444', display: 'flex', gap: 6 }}>
                            <strong>Row {inv.rowIndex} ({inv.name || 'Unnamed'}):</strong> {inv.errorReason}
                          </div>
                        ))}
                        {validationResult.duplicateRecords?.map((dup, i) => (
                          <div key={`dup-${i}`} style={{ color: '#F59E0B', display: 'flex', gap: 6 }}>
                            <strong>Row {dup.rowIndex} ({dup.name}):</strong> {dup.errorReason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Table Preview */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      CSV Records Preview (First {Math.min(validationResult.preview?.length || 0, 20)} rows)
                    </h5>
                    {validationResult.totalRecords > 20 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        + {validationResult.totalRecords - 20} more records ready
                      </span>
                    )}
                  </div>

                  <div style={{
                    overflowX: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead style={{ background: 'var(--bg-surface-elevated, #25252d)', position: 'sticky', top: 0 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '8px 10px' }}>ID</th>
                          <th style={{ padding: '8px 10px' }}>Name</th>
                          <th style={{ padding: '8px 10px' }}>Plan / Type</th>
                          <th style={{ padding: '8px 10px' }}>Start Date</th>
                          <th style={{ padding: '8px 10px' }}>End Date</th>
                          <th style={{ padding: '8px 10px' }}>Total</th>
                          <th style={{ padding: '8px 10px' }}>Received</th>
                          <th style={{ padding: '8px 10px' }}>Balance</th>
                          <th style={{ padding: '8px 10px' }}>Rc No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.preview?.map((row, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                            }}
                          >
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                              {row.rawId || 'Auto'}
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {row.name || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--brand-primary)' }}>
                              {row.membershipType || 'General'}
                            </td>
                            <td style={{ padding: '6px 10px' }}>{row.startDate || '—'}</td>
                            <td style={{ padding: '6px 10px' }}>{row.endDate || '—'}</td>
                            <td style={{ padding: '6px 10px' }}>₹{row.totalAmount || 0}</td>
                            <td style={{ padding: '6px 10px', color: '#10B981', fontWeight: 600 }}>
                              ₹{row.receivedAmount || 0}
                            </td>
                            <td style={{
                              padding: '6px 10px',
                              color: row.balanceAmount > 0 ? '#F59E0B' : 'var(--text-muted)',
                              fontWeight: row.balanceAmount > 0 ? 600 : 400
                            }}>
                              ₹{row.balanceAmount || 0}
                            </td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>
                              {row.receiptNumber || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Confirmation Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 10
                }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={isImporting}
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleExecuteImport}
                    disabled={isImporting || validationResult.validCount === 0}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Importing in Batches...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Import {validationResult.validCount} Members</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default ImportMembersModal;

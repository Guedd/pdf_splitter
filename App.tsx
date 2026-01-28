
import React, { useState, useCallback, useRef } from 'react';
import { loadPdfDocument, splitAndZipPdf } from './services/pdfService';
import { suggestSections } from './services/geminiService';
import { PdfSection, PdfMetadata, AppStatus } from './types';
import { Button } from './components/Button';
import { PdfPreview } from './components/PdfPreview';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [pdf, setPdf] = useState<any>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [folderName, setFolderName] = useState<string>('Exported_PDFs');
  const [sections, setSections] = useState<PdfSection[]>([]);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(AppStatus.LOADING_PDF);
    setError(null);
    try {
      const { pdf, arrayBuffer } = await loadPdfDocument(file);
      setPdf(pdf);
      setPdfBuffer(arrayBuffer);
      setMetadata({
        name: file.name,
        pageCount: pdf.numPages,
        size: file.size
      });
      setFolderName(file.name.replace(/\.[^/.]+$/, ""));
      setSections([{
        id: Math.random().toString(36).substr(2, 9),
        name: 'Section 1',
        startPage: 1,
        endPage: pdf.numPages
      }]);
      setStatus(AppStatus.READY);
    } catch (err: any) {
      setError("Failed to load PDF. It might be password protected or corrupted.");
      setStatus(AppStatus.ERROR);
    }
  };

  const addSection = () => {
    if (!metadata) return;
    const lastSection = sections[sections.length - 1];
    const newStart = lastSection ? Math.min(lastSection.endPage + 1, metadata.pageCount) : 1;
    
    setSections([...sections, {
      id: Math.random().toString(36).substr(2, 9),
      name: `Section ${sections.length + 1}`,
      startPage: newStart,
      endPage: metadata.pageCount
    }]);
  };

  const updateSection = (id: string, updates: Partial<PdfSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const handleSmartDetect = async () => {
    if (!pdf || !metadata) return;
    setIsAiLoading(true);
    try {
      const suggested = await suggestSections(pdf, metadata.pageCount);
      const newSections = suggested.map((s: any) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setSections(newSections);
    } catch (err) {
      setError("AI analysis failed. Please manually set sections.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExport = async () => {
    if (!pdfBuffer || sections.length === 0) return;
    
    // Validation
    for (const section of sections) {
      if (section.startPage < 1 || section.endPage > (metadata?.pageCount || 0) || section.startPage > section.endPage) {
        setError(`Invalid page range in section: ${section.name}`);
        return;
      }
    }

    setStatus(AppStatus.PROCESSING);
    try {
      const zipBlob = await splitAndZipPdf(pdfBuffer, folderName, sections);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to process PDF export.");
    } finally {
      setStatus(AppStatus.READY);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <i className="fa-solid fa-file-pdf text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">PDF Splitter Pro</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">AI-Powered Extraction</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {metadata && (
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Change File
            </Button>
          )}
          <Button 
            variant="primary" 
            onClick={handleExport}
            disabled={status !== AppStatus.READY || sections.length === 0}
            isLoading={status === AppStatus.PROCESSING}
          >
            <i className="fa-solid fa-download"></i>
            Export as ZIP
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Sections */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* File Upload Area */}
          {!metadata && (
            <div 
              className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-12 text-center cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="application/pdf"
                onChange={handleFileUpload}
              />
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-cloud-arrow-up text-2xl text-blue-600"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Upload PDF to get started</h3>
              <p className="text-gray-500 mt-2">Drag and drop your document here or click to browse</p>
            </div>
          )}

          {metadata && (
            <>
              {/* Document Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase">Current Document</h2>
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">{metadata.name}</p>
                    <p className="text-sm text-gray-500">{metadata.pageCount} pages • {(metadata.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex flex-col gap-2">
                     <Button 
                      variant="ghost" 
                      className="text-xs text-blue-600 h-8"
                      onClick={handleSmartDetect}
                      isLoading={isAiLoading}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                      Smart Detect
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase">ZIP Parent Folder Name</label>
                  <input 
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Sections List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-bold text-gray-800">Split Sections</h2>
                  <Button variant="ghost" className="text-blue-600 text-sm h-8" onClick={addSection}>
                    <i className="fa-solid fa-plus"></i> Add Section
                  </Button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {sections.map((section, index) => (
                    <div key={section.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase">Section {index + 1}</span>
                        <button 
                          onClick={() => removeSection(section.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Section Name</label>
                          <input 
                            type="text"
                            placeholder="Chapter name, Intro, etc."
                            value={section.name}
                            onChange={(e) => updateSection(section.id, { name: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Start Page</label>
                            <input 
                              type="number"
                              min="1"
                              max={metadata.pageCount}
                              value={section.startPage}
                              onChange={(e) => updateSection(section.id, { startPage: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">End Page</label>
                            <input 
                              type="number"
                              min="1"
                              max={metadata.pageCount}
                              value={section.endPage}
                              onChange={(e) => updateSection(section.id, { endPage: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button 
                          className="text-[10px] text-blue-600 hover:underline font-bold uppercase"
                          onClick={() => setPreviewPage(section.startPage)}
                        >
                          Jump to start
                        </button>
                        <button 
                          className="text-[10px] text-blue-600 hover:underline font-bold uppercase"
                          onClick={() => setPreviewPage(section.endPage)}
                        >
                          Jump to end
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {sections.length === 0 && (
                    <div className="text-center py-12 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-500">No sections defined yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: PDF Viewer */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[80vh] sticky top-24">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Document Preview</h2>
              {metadata && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                    className="p-1 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <span className="text-sm font-medium">Page {previewPage} of {metadata.pageCount}</span>
                  <button 
                    onClick={() => setPreviewPage(Math.min(metadata.pageCount, previewPage + 1))}
                    className="p-1 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-100 p-8 custom-scrollbar">
              {pdf ? (
                <PdfPreview pdf={pdf} currentPage={previewPage} />
              ) : (
                <div className="h-full flex items-center justify-center flex-col text-gray-400 gap-4">
                  <i className="fa-solid fa-file-invoice text-6xl opacity-20"></i>
                  <p>Upload a PDF to preview its contents</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer Info */}
      <footer className="mt-12 py-8 bg-white border-t border-gray-200 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} PDF Splitter Pro • Powered by Gemini AI & PDFLib</p>
      </footer>
    </div>
  );
};

export default App;

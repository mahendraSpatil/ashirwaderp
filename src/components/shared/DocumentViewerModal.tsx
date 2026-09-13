import { FileBadge, X, FileText, AlertTriangle } from 'lucide-react';

interface DocumentViewerModalProps {
  viewingDoc: any | null;
  activePatient: any | null;
  onClose: () => void;
}

export default function DocumentViewerModal({ viewingDoc, activePatient, onClose }: DocumentViewerModalProps) {
  if (!viewingDoc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-beige-200 bg-beige-50">
          <div className="flex items-center gap-3">
            <FileBadge className="w-5 h-5 text-terracotta-500" strokeWidth={1.5} />
            <div>
              <h3 className="font-serif text-lg text-ink-900 leading-tight">{viewingDoc.name}</h3>
              <p className="text-xs text-ink-500">{viewingDoc.type}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-beige-200 text-ink-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 bg-beige-100/50 p-6 overflow-auto flex items-center justify-center min-h-[400px]">
          {viewingDoc.url ? (
            viewingDoc.name.toLowerCase().endsWith('.pdf') ? (
              <iframe 
                src={viewingDoc.url} 
                className="w-full h-[600px] rounded-xl border border-beige-200 shadow-sm bg-white" 
                title={viewingDoc.name} 
              />
            ) : viewingDoc.name.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) ? (
              <img 
                src={viewingDoc.url} 
                alt={viewingDoc.name} 
                className="max-w-full max-h-[600px] rounded-xl shadow-sm object-contain" 
              />
            ) : (
              <div className="text-center text-ink-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" strokeWidth={1} />
                <p>Preview not available for this file type.</p>
                <a href={viewingDoc.url} target="_blank" rel="noreferrer" className="text-terracotta-500 hover:underline mt-2 inline-block">Download File</a>
              </div>
            )
          ) : (
            <div className="text-center text-ink-400">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-30" strokeWidth={1} />
              <p>Document source file not found.</p>
              <p className="text-sm mt-1">This document was uploaded before the file storage feature was enabled.</p>
              <p className="text-xs mt-3 font-mono">{viewingDoc.hash}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

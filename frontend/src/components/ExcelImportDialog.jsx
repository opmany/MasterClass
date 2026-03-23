import { useState, useRef } from "react";
import { integrations } from "@/api/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function ExcelImportDialog({ open, onOpenChange, onConfirm }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedWords, setParsedWords] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      setError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    setError(null);
    setLoading(true);
    setParsedWords(null);

    const { file_url } = await integrations.Core.UploadFile({ file });

    const result = await integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          words: {
            type: "array",
            items: {
              type: "object",
              properties: {
                word: { type: "string", description: "The English word" },
                meaning: { type: "string", description: "The English meaning or definition" },
                translation: { type: "string", description: "The Hebrew translation" },
              },
              required: ["word"],
            },
          },
        },
      },
    });

    setLoading(false);

    if (result.status === "error" || !result.output?.words?.length) {
      setError("Could not extract words from the file. Make sure it has columns for word, meaning, and Hebrew translation.");
      return;
    }

    setParsedWords(result.output.words.map((w, i) => ({ ...w, _key: i })));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const updateWord = (index, field, value) => {
    setParsedWords(prev => prev.map((w, i) => i === index ? { ...w, [field]: value } : w));
  };

  const removeWord = (index) => {
    setParsedWords(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    const valid = parsedWords.filter(w => w.word?.trim());
    if (!valid.length) {
      toast.error("No valid words to import.");
      return;
    }
    onConfirm(valid);
    onOpenChange(false);
    setParsedWords(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setParsedWords(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import from Excel / CSV
          </DialogTitle>
        </DialogHeader>

        {!parsedWords ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Upload an Excel or CSV file. The file should have columns for the English <strong>word</strong>, its <strong>meaning/definition</strong>, and the <strong>Hebrew translation</strong>.
            </p>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
              `}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Parsing file with AI…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-muted-foreground/50" />
                  <p className="font-medium">Drag & drop your file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse — .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <strong>{parsedWords.length}</strong> words parsed. Review and edit before importing.
              </p>
              <Button size="sm" variant="ghost" onClick={() => { setParsedWords(null); setError(null); }}>
                Upload different file
              </Button>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Word</Label>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Meaning</Label>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Translation (Hebrew)</Label>
              <div />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <AnimatePresence>
                {parsedWords.map((w, i) => (
                  <motion.div
                    key={w._key}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center"
                  >
                    <Input
                      value={w.word || ""}
                      onChange={e => updateWord(i, "word", e.target.value)}
                      placeholder="Word"
                      className="text-sm h-8"
                    />
                    <Input
                      value={w.meaning || ""}
                      onChange={e => updateWord(i, "meaning", e.target.value)}
                      placeholder="Meaning"
                      className="text-sm h-8"
                    />
                    <Input
                      value={w.translation || ""}
                      onChange={e => updateWord(i, "translation", e.target.value)}
                      placeholder="תרגום"
                      dir="rtl"
                      className="text-sm h-8"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeWord(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex gap-3 pt-2 border-t">
              <Button onClick={handleConfirm} className="gap-2 flex-1">
                <CheckCircle className="w-4 h-4" />
                Confirm & Import {parsedWords.length} Words
              </Button>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
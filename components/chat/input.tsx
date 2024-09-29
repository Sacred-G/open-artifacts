import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useEnterSubmit } from "@/lib/hooks/use-enter-submit";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleStopIcon,
  MicIcon,
  PaperclipIcon,
  PauseIcon,
  FileIcon,
  Loader2Icon,
} from "lucide-react";
import Textarea from "react-textarea-autosize";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Attachment, Models } from "@/app/types";
import { getSettings, updateSettings } from "@/lib/userSettings";
import { AttachmentPreviewButton } from "@/components/chat/attachment-preview-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { convertFileToBase64 } from "@/lib/utils";
import dynamic from 'next/dynamic';
import * as pdfjs from 'pdfjs-dist';  
// Import PDF.js correctly

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export type Props = {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
  isLoading: boolean;
  recording: boolean;
  onStartRecord: () => void;
  onStopRecord: () => void;
  attachments: Attachment[];
  onRemoveAttachment: (attachment: Attachment) => void;
  onAddAttachment: (newAttachments: (File | Attachment)[]) => void;
  showScrollButton: boolean;
  handleManualScroll: () => void;
  stopGenerating: () => void;
};

export const ChatInput: React.FC<Props> = ({
  input,
  setInput,
  onSubmit,
  isLoading,
  recording,
  onStartRecord,
  onStopRecord,
  attachments,
  onRemoveAttachment,
  onAddAttachment,
  showScrollButton,
  handleManualScroll,
  stopGenerating,
}: Props) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { onKeyDown } = useEnterSubmit({ onSubmit });
  const [model, setModel] = useState<Models>(getSettings().model);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await pdfjs;
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(' ') + '\n';
      }

      return text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePDFUpload = () => {
    pdfInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newAttachments = await Promise.all(
        filesArray.map(async (file) => ({
          url: await convertFileToBase64(file),
          name: file.name,
          contentType: file.type,
        }))
      );
      onAddAttachment(newAttachments);
    }
  };

  const handlePDFChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      if (file && file.type === 'application/pdf') {
        try {
          setIsUploading(true);
          const text = await extractTextFromPdf(file);
          setInput(prevInput => `${prevInput}\nExtracted text from PDF: ${file.name}\n\n${text}`);
          setUploadError('PDF processed successfully!');
        } catch (error) {
          console.error('Error processing PDF:', error);
          setUploadError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
          setIsUploading(false);
        }
      } else {
        setUploadError('Please select a valid PDF file.');
      }
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleModelChange = (newModel: Models) => {
    setModel(newModel);
    updateSettings({ ...getSettings(), model: newModel });
  };

  return (
    <div className="sticky bottom-0 mx-auto w-full pt-6 flex flex-col gap-4 items-center">
      {showScrollButton && (
        <Button
          onClick={handleManualScroll}
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg w-8 h-8"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </Button>
      )}

      <div className="w-full flex flex-col gap-1 bg-[#F4F4F4] p-2.5 pl-4 rounded-md border border-b-0 rounded-b-none shadow-md">
        {attachments && attachments.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {attachments.map((attachment, index) => (
              <AttachmentPreviewButton
                key={index}
                value={attachment}
                onRemove={onRemoveAttachment}
              />
            ))}
          </div>
        )}

        {uploadError && (
          <div className={`text-sm mb-2 ${uploadError.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>
            {uploadError}
          </div>
        )}

        <div className="flex gap-2 items-start">
          <Textarea
            ref={inputRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            placeholder="Send a message."
            className="min-h-15 max-h-96 overflow-auto w-full bg-transparent border-none resize-none focus-within:outline-none"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            name="message"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
            aria-label="Attach file"
          />

          <input
            type="file"
            accept=".pdf"
            onChange={handlePDFChange}
            style={{ display: 'none' }}
            ref={pdfInputRef}
            aria-label="Upload PDF"
          />

          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 bg-transparent"
            onClick={handleFileUpload}
          >
            <PaperclipIcon className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 bg-transparent"
            onClick={handlePDFUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <FileIcon className="w-4 h-4" />
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => (recording ? onStopRecord() : onStartRecord())}
                  size="icon"
                  variant="outline"
                  className="w-8 h-8 bg-transparent disabled:pointer-events-auto"
                >
                  {recording ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <MicIcon className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {getSettings().openaiApiKey
                    ? "Click to record voice and crop artifacts for editing"
                    : "Missing OpenAI API Key in Settings for Speech to Text"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            onClick={isLoading ? stopGenerating : onSubmit}
            size="icon"
            className="w-8 h-8"
          >
            {isLoading ? (
              <CircleStopIcon className="w-4 h-4" />
            ) : (
              <ArrowUpIcon className="w-4 h-4" />
            )}
          </Button>
        </div>

        <Select value={model || undefined} onValueChange={handleModelChange}>
          <SelectTrigger className="w-fit bg-[#F4F4F4] flex items-center gap-2 border-none">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent className="w-fit">
            <SelectItem value={Models.claude}>Claude Sonnet</SelectItem>
            <SelectItem value={Models.gpt4oMini}>GPT-4o Mini</SelectItem>
            <SelectItem value={Models.gpt4o}>GPT-4o</SelectItem>
            <SelectItem value={Models.gpt4turbo}>GPT-4 Turbo</SelectItem>
            <SelectItem value={Models.gpt35turbo}>GPT-3.5 Turbo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
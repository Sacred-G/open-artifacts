"use client";

import { useEffect, useState, useCallback } from "react";
import { ArtifactPanel } from "@/components/artifact";
import { ChatInput, Props as ChatInputProps } from "@/components/chat/input";
import { ChatMessageList } from "@/components/chat/message-list";
import { Message, useChat } from "ai/react";
import { getSettings } from "@/lib/userSettings";
import { addMessage, createChat, getChatMessages } from "@/lib/db";
import { Loader2Icon, XCircleIcon, UploadIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase";
import { Chat, Models, Attachment } from "@/app/types";
import { ArtifactMessagePartData } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useWhisper as useRealWhisper } from "@chengsokdara/use-whisper";
import { Props as ReactArtifactProps } from "@/components/artifact/react";
import { useScrollAnchor } from "@/lib/hooks/use-scroll-anchor";
import { useFakeWhisper } from "@/lib/hooks/use-fake-whisper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import * as pdfjs from 'pdfjs-dist';

// Update the worker source path
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type Props = {
  id: string | null;
  pdfContext?: { content: string; name: string } | null;
};

// Update PDF file paths
const PDF_FILES = [
  { name: 'SCHEDULE FOR RATING PERMANENT DISABILITIES', path: '/pdr1997.pdf' },
  { name: 'PDIndemnityChart', path: '/PDIndemnityChart2021.pdf' },
];

export const ChatPanel = ({ id }: Props) => {
  const settings = getSettings();
  const { supabase, session } = useSupabase();
  const queryClient = useQueryClient();
  const router = useRouter();
  const useWhisperHook = settings.openaiApiKey ? useRealWhisper : useFakeWhisper;
  const [chatId, setChatId] = useState(id);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactMessagePartData | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>([]);
  const [pdfContext, setPdfContext] = useState<{ content: string; name: string } | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (chatId) {
      setFetchingMessages(true);
      try {
        const messages = await getChatMessages(supabase, chatId);
        setInitialMessages(
          messages.map((message) => ({
            id: String(message.id),
            role: message.role as Message["role"],
            content: message.content, // Changed from message.text to message.content
            experimental_attachments: (message.attachments as Attachment[]) || [],
          }))
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to fetch messages');
      } finally {
        setFetchingMessages(false);
      }
    } else {
      setInitialMessages([]);
    }
  }, [chatId, supabase]);

  const handlePdfSelection = async (pdfPath: string) => {
    try {
      const loadingTask = pdfjs.getDocument(pdfPath);
      const pdfDocument = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      const pdfName = PDF_FILES.find(file => file.path === pdfPath)?.name || 'Selected PDF';
      setPdfContext({ content: fullText, name: pdfName });
      setSelectedPdf(pdfPath);
      toast.success(`PDF "${pdfName}" loaded successfully. Context added for AI.`);

      // Create an automatic message
      const automaticMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `PDF "${pdfName}" has been uploaded successfully. You can now ask questions about its content.`,
      };
    
      if (chatId) {
        await addMessage(supabase, chatId, automaticMessage);
      } else {
        // If there's no chat yet, create a new one
        const newChat = await createChat(supabase, `Chat about ${pdfName}`, session?.user.id);
        setChatId(newChat.id);
        await addMessage(supabase, newChat.id, automaticMessage);
        router.push(`/chat/${newChat.id}`);
      }
    } catch (error) {
      console.error('Error reading PDF:', error);
      toast.error('Failed to read the selected PDF');
    }
  };

  const handlePdfUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }

      const data = await response.json();
      toast.success(`PDF "${data.pdf.filename}" uploaded successfully.`);

      // Load the PDF content
      const arrayBuffer = await file.arrayBuffer();
      const pdfDocument = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      setPdfContext({ content: fullText, name: data.pdf.filename });
      setSelectedPdf(data.pdf.filename);

      // Create an automatic message
      const automaticMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `PDF "${data.pdf.filename}" has been uploaded successfully. You can now ask questions about its content.`,
      };
    
      if (chatId) {
        await addMessage(supabase, chatId, automaticMessage);
      } else {
        // If there's no chat yet, create a new one
        const newChat = await createChat(supabase, `Chat about ${data.pdf.filename}`, session?.user.id);
        setChatId(newChat.id);
        await addMessage(supabase, newChat.id, automaticMessage);
        router.push(`/chat/${newChat.id}`);
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Failed to upload the PDF');
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const createChatMutation = useMutation({
    mutationFn: async ({
      title,
    }: {
      title: string;
      firstMessage: Message;
      secondMessage: Message;
    }) => await createChat(supabase, title, session?.user.id),
    onSuccess: async (newChat, { firstMessage, secondMessage }) => {
      queryClient.setQueryData<Chat[]>(["chats"], (oldChats) => {
        return [...(oldChats || []), newChat];
      });
      setChatId(newChat.id);

      await addMessage(supabase, newChat.id, firstMessage);
      await addMessage(supabase, newChat.id, secondMessage);

      router.push(`/chat/${newChat.id}`);
    },
  });

  const {
    messages,
    input,
    setInput,
    append,
    stop: stopGenerating,
    isLoading: generatingResponse,
  } = useChat({
    initialMessages,
    onFinish: async (message) => {
      if (chatId) {
        await addMessage(supabase, chatId, message);
      }
    },
    sendExtraMessageFields: true,
  });

  const { messagesRef, scrollRef, showScrollButton, handleManualScroll } = useScrollAnchor(messages);

  useEffect(() => {
    if (!chatId && messages.length === 2 && !generatingResponse) {
      createChatMutation.mutate({
        title: messages[0].content.slice(0, 100),
        firstMessage: messages[0],
        secondMessage: messages[1],
      });
    }
  }, [chatId, messages, generatingResponse, createChatMutation]);

  const whisperHookProps = settings.openaiApiKey 
    ? { apiKey: settings.openaiApiKey }
    : {};

  const { recording, transcribing, transcript, startRecording, stopRecording } = useWhisperHook(whisperHookProps);

  useEffect(() => {
    if (!recording && !transcribing && transcript?.text) {
      setInput((prev) => prev + ` ${transcript.text}`);
    }
  }, [recording, transcribing, transcript?.text, setInput]);

  const handleCapture: ReactArtifactProps["onCapture"] = ({ selectionImg, artifactImg }) => {
    setAttachments((prev) => [
      ...prev,
      {
        contentType: "image/png",
        url: selectionImg,
      },
    ]);

    setSelectedArtifacts((prev) => {
      if (prev.includes(artifactImg)) return prev;
      return [...prev, artifactImg];
    });
  };

  type AttachmentOrFile = Attachment | File;
  const handleAddAttachment: ChatInputProps["onAddAttachment"] = (newAttachments: AttachmentOrFile[]) => {
    setAttachments((prev) =>
      prev.concat(
        newAttachments.map(attachment => {
          if ('url' in attachment && 'contentType' in attachment) {
            // This is an Attachment
            return attachment as Attachment;
          } else if (attachment instanceof File) {
            // This is a File
            return {
              url: URL.createObjectURL(attachment),
              contentType: attachment.type
            };
          } else {
            // This should never happen, but TypeScript requires us to handle this case
            console.error('Invalid attachment type:', attachment);
            return null;
          }
        }).filter((attachment): attachment is Attachment => attachment !== null)
      )
    );
  };

  const handleRemoveAttachment: ChatInputProps["onRemoveAttachment"] = (attachment) => {
    setAttachments((prev) => prev.filter((item) => item.url !== attachment.url));
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query) return;

    const settings = getSettings();

    if (settings.model === Models.claude && !settings.anthropicApiKey) {
      toast.error("Please enter your Claude API Key");
      return;
    }

    if (settings.model.startsWith("gpt") && !settings.openaiApiKey) {
      toast.error("Please enter your OpenAI API Key");
      return;
    }

    let messageContent = query;
    if (pdfContext) {
      messageContent = `[PDF Context from "${pdfContext.name}"]\n${pdfContext.content}\n\nUser Query: ${query}`;
    }

    await append(
      {
        role: "user",
        content: messageContent,
        experimental_attachments: attachments.map(att => ({ url: att.url, contentType: att.contentType })),
      },
      {
        body: {
          model: settings.model,
          apiKey: settings.model.startsWith("gpt") ? settings.openaiApiKey : settings.anthropicApiKey,
        },
      }
    );

    setInput("");
    stopRecording();

    if (chatId) {
      await addMessage(
        supabase,
        chatId,
        { role: "user", content: messageContent },
        attachments
      );
    }

    setAttachments([]);
    setSelectedArtifacts([]);
  };

  return (
    <>
      <div
        className="relative flex w-full flex-1 overflow-x-hidden overflow-y-scroll pt-6"
        ref={scrollRef}
      >
        <div className="relative mx-auto flex h-full w-full min-w-[400px] max-w-3xl flex-1 flex-col md:px-2">
          {fetchingMessages && <Loader2Icon className="animate-spin mx-auto" />}

          <ChatMessageList
            messages={messages}
            setCurrentArtifact={setCurrentArtifact}
            containerRef={messagesRef}
          />

          <div className="mb-4 flex gap-2">
            <Select onValueChange={handlePdfSelection} value={selectedPdf || undefined}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a PDF for context" />
              </SelectTrigger>
              <SelectContent>
                {PDF_FILES.map((file) => (
                  <SelectItem key={file.path} value={file.path}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              id="pdf-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handlePdfUpload(file);
                }
              }}
            />
            <Button onClick={() => document.getElementById('pdf-upload')?.click()}>
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload PDF
            </Button>
          </div>

          {pdfContext && (
            <div className="bg-blue-100 p-2 mb-4 rounded-md flex justify-between items-center">
              <p className="text-sm text-blue-800">
                PDF context from {pdfContext.name} added. AI will use this for the next query.
              </p>
              <Button
                onClick={() => {
                  setPdfContext(null);
                  setSelectedPdf(null);
                }}
                size="sm"
                variant="ghost"
                className="text-blue-800 hover:text-blue-600"
              >
                <XCircleIcon size={16} />
              </Button>
            </div>
          )}

          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSend}
            isLoading={generatingResponse}
            recording={recording}
            onStartRecord={startRecording}
            onStopRecord={stopRecording}
            attachments={attachments}
            onAddAttachment={handleAddAttachment}
            onRemoveAttachment={handleRemoveAttachment}
            showScrollButton={showScrollButton}
            handleManualScroll={handleManualScroll}
            stopGenerating={stopGenerating}
          />
        </div>
      </div>

      {currentArtifact && (
        <div className="w-full max-w-xl h-full max-h-full pt-6 pb-4">
          <ArtifactPanel
            title={currentArtifact.title}
            id={currentArtifact.id}
            type={currentArtifact.type}
            generating={currentArtifact.generating}
            content={currentArtifact.content}
            language={currentArtifact.language}
            onClose={() => setCurrentArtifact(null)}
            recording={recording}
            onCapture={handleCapture}
          />
        </div>
      )}
    </>
  );
};
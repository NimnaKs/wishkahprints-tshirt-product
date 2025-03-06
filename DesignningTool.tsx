"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Eye,
  CheckCircle,
  ChevronLeft,
  Type,
  Droplet,
  Palette,
  Trash2,
  Bold,
  Italic,
  Underline,
  PlusCircle,
} from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Rnd } from "react-rnd";
import InstructionDialog from "./InstructionDialog";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { Checkbox } from "./ui/checkbox";
import { ArtWork } from "./ArtWork";
import axios from "axios";
import { analyzeColors } from "@/utils/colorCount";
import Link from "next/link";

// ----- Type Definitions -----
type TextFieldProperties = {
  fontFamily: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  color: string;
  textAlign: string;
};

type TextField = {
  id: number;
  x: number;
  y: number;
  text: string;
  textFieldProperties: TextFieldProperties;
};

type DesignImage = {
  id: number;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SafeZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CurrentDesign = {
  id: number;
  textFields: number[];
  images: number[];
  colorFill: string;
};

const availableFonts = [
  "Helvetica",
  "Arial",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Georgia",
  "Tahoma",
];

const DesigningTool = () => {
  const router = useRouter();

  // ----- State Declarations -----
  const [decoAreas, setDecoAreas] = useState<any[]>([]);
  const [orderSummary, setOrderSummary] = useState<any>({});
  const [productData, setProductData] = useState<any>({});
  const [slug, setSlug] = useState<any>({});
  const [selectedCard, setSelectedCard] = useState<number>(0);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [safeZone, setSafeZone] = useState<SafeZone>({ x: 100, y: 100, width: 100, height: 100 });
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const [designImages, setDesignImages] = useState<DesignImage[]>([]);
  const [selectedTextFieldId, setSelectedTextFieldId] = useState<number | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState(16);
  const [currentDesignElement, setCurrentDesignElement] = useState<CurrentDesign[]>([]);
  const [selectedColor, setSelectedColor] = useState<{ selectedColor: string; selectedColorName: string; }>({
    selectedColor: "#FFFFFF",
    selectedColorName: "white",
  });
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<{ status: "green" | "yellow"; lastSaved: string | null; }>({
    status: "yellow",
    lastSaved: null,
  });
  const [isNextModelOpen, setIsNextModelOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [artWorkDesignDetails, setArtWorkDesignDetails] = useState<Record<number, { url: string; name: string; file: File; maxWidth: number }>>({});
  const [colorCounts, setColorCounts] = useState<number[]>([]);
  const [updatedCounts, setUpdatedCounts] = useState<number[]>([]);
  const [s3Urls, setS3Urls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [colorInputs, setColorInputs] = useState<Record<number, string[]>>({});
  const [error, setError] = useState("");
  const [isColorNext, setIsColorNext] = useState(false);

  // ----- Local Storage Initialization -----
  useEffect(() => {
    const storedDecoAreas = JSON.parse(localStorage.getItem("decoAreas") || "[]");
    const storedOrderSummary = JSON.parse(localStorage.getItem("orderSummary") || "{}");
    const storedProductData = JSON.parse(localStorage.getItem("productData") || "{}");
    const storedSlug = JSON.parse(localStorage.getItem("slug") || "{}");

    setDecoAreas(storedDecoAreas);
    setOrderSummary(storedOrderSummary);
    setProductData(storedProductData);
    setSlug(storedSlug);
    if (storedOrderSummary.selectedColor) {
      setSelectedColor({
        selectedColor: storedOrderSummary.selectedColor.color,
        selectedColorName: storedOrderSummary.selectedColor.colorName,
      });
    }
  }, []);

  // Update safe zone when decoAreas or selected card changes
  const updateSafeZone = useCallback(() => {
    const currentArea = decoAreas[selectedCard];
    if (currentArea) {
      setSafeZone({
        x: currentArea.x,
        y: currentArea.y,
        width: currentArea.width,
        height: currentArea.height,
      });
    }
  }, [decoAreas, selectedCard]);

  useEffect(() => {
    updateSafeZone();
  }, [decoAreas, selectedCard, updateSafeZone]);

  // ----- Local Storage for Design Data -----
  useEffect(() => {
    const savedData = localStorage.getItem("designingToolData");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setTextFields(Array.isArray(parsedData.textFields) ? parsedData.textFields : []);
        const validatedImages = Array.isArray(parsedData.images)
          ? parsedData.images.map((img: any) => ({
              ...img,
              width: img.width || 100,
              height: img.height || 100,
            }))
          : [];
        setDesignImages(validatedImages);
        setCurrentDesignElement(Array.isArray(parsedData.currentDesignElement) ? parsedData.currentDesignElement : []);
      } catch (error) {
        console.error("Error parsing designingToolData:", error);
        localStorage.removeItem("designingToolData");
      }
    }
  }, []);

  // Auto-save design details to localStorage after changes
  useEffect(() => {
    const designData = {
      decoAreas,
      selectedCard,
      textFields,
      images: designImages,
      selectedColor,
      currentDesignElement,
    };
    localStorage.setItem("designingToolData", JSON.stringify(designData));
    setSaveStatus((prev) => ({ ...prev, status: "yellow" }));
    const saveTimeout = setTimeout(() => {
      const currentTime = new Date().toLocaleString();
      setSaveStatus({ status: "green", lastSaved: currentTime });
    }, 1000);
    return () => clearTimeout(saveTimeout);
  }, [textFields, designImages, selectedColor, currentDesignElement, decoAreas, selectedCard]);

  // Reset checkbox when next modal closes
  useEffect(() => {
    if (!isNextModelOpen) setIsChecked(false);
  }, [isNextModelOpen]);

  // Save selected color separately
  useEffect(() => {
    localStorage.setItem("selectedColor", JSON.stringify(selectedColor));
  }, [selectedColor]);

  // Initialize colorInputs per decoration area
  useEffect(() => {
    setColorInputs(
      Array(decoAreas.length)
        .fill(null)
        .reduce((acc, _, index) => ({ ...acc, [index]: [] }), {})
    );
  }, [decoAreas]);

  // ----- Helper Functions -----

  const updateDesignField = (cardId: number, updater: (design: CurrentDesign | undefined) => CurrentDesign) => {
    setCurrentDesignElement((prev) => {
      const design = prev.find((d) => d.id === cardId);
      if (design) {
        return prev.map((d) => (d.id === cardId ? updater(d) : d));
      } else {
        return [...prev, updater(undefined)];
      }
    });
  };

  const addTextFieldToDesign = (cardId: number, textFieldId: number) => {
    updateDesignField(cardId, (design) =>
      design
        ? { ...design, textFields: [...design.textFields, textFieldId] }
        : { id: cardId, textFields: [textFieldId], images: [], colorFill: "transparent" }
    );
  };

  const addImageToDesign = (cardId: number, imageId: number) => {
    updateDesignField(cardId, (design) =>
      design
        ? { ...design, images: [...design.images, imageId] }
        : { id: cardId, textFields: [], images: [imageId], colorFill: "transparent" }
    );
  };

  const updateDesignColorFill = (cardId: number, color: string) => {
    updateDesignField(cardId, (design) =>
      design
        ? { ...design, colorFill: color }
        : { id: cardId, textFields: [], images: [], colorFill: color }
    );
  };

  // ----- Event Handlers -----

  const handleCardClick = (index: number) => {
    setSelectedCard(index);
    updateSafeZone();
  };

  const getSafeZoneStyle = (area: any) => {
    const { x, y, width, height } = area;
    const currentDesign = currentDesignElement.find((design) => design.id === selectedCard);
    return {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: currentDesign ? currentDesign.colorFill : "transparent",
      border: "2px dashed #0f766e",
      zIndex: 1,
      pointerEvents: "none",
    };
  };

  const handleButtonClick = (button: string) => {
    updateSafeZone();
    setActiveButton(button);
  };

  const handleNewTextField = () => {
    updateSafeZone();
    const newTextField: TextField = {
      id: Date.now(),
      x: 5,
      y: 5,
      text: "New Text",
      textFieldProperties: {
        fontFamily: "Arial",
        fontSize: 16,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        color: "#000000",
        textAlign: "left",
      },
    };
    addTextFieldToDesign(selectedCard, newTextField.id);
    setTextFields((prev) => [...prev, newTextField]);
  };

  const openColorPicker = () => {
    colorInputRef.current?.click();
  };

  const handleTextFieldClick = (id: number) => {
    setSelectedTextFieldId(id);
  };

  const handleDeleteTextField = () => {
    if (selectedTextFieldId !== null) {
      setTextFields((prev) => prev.filter((field) => field.id !== selectedTextFieldId));
      setSelectedTextFieldId(null);
    }
  };

  const updateTextFieldProperty = (property: keyof TextFieldProperties, value: any) => {
    setTextFields((prev) =>
      prev.map((field) =>
        field.id === selectedTextFieldId
          ? {
              ...field,
              textFieldProperties: {
                ...field.textFieldProperties,
                [property]: typeof value === "function" ? value(field.textFieldProperties[property]) : value,
              },
            }
          : field
      )
    );
  };

  const getButtonStyle = (isActive: boolean) =>
    isActive ? "bg-black text-white rounded-full p-2" : "text-black rounded-lg p-2";

  const handleDragStop = (id: number, d: { x: number; y: number }) => {
    updateSafeZone();
    handleTextFieldClick(id);
    setTextFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, x: d.x, y: d.y } : field))
    );
  };

  const handleImageDragStop = (id: number, d: { x: number; y: number }) => {
    updateSafeZone();
    setDesignImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, x: d.x, y: d.y } : img))
    );
  };

  const handleColorSelect = (value: string) => {
    updateSafeZone();
    updateDesignColorFill(selectedCard, value);
  };

  const handleColorClick = (hex: string, name: string) => {
    setSelectedColor({ selectedColor: hex, selectedColorName: name });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSafeZone();
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const img = new window.Image();
          img.src = e.target.result.toString();
          img.onload = () => {
            const targetWidth = 100;
            const aspectRatio = img.height / img.width;
            const targetHeight = targetWidth * aspectRatio;
            const newImg: DesignImage = {
              id: Date.now(),
              src: e.target!.result.toString(),
              x: 5,
              y: 5,
              width: targetWidth,
              height: targetHeight,
            };
            setDesignImages((prev) => [...prev, newImg]);
            addImageToDesign(selectedCard, newImg.id);
          };
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageResizeStop = (id: number, ref: any, position: { x: number; y: number }) => {
    updateSafeZone();
    setDesignImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? {
              ...img,
              width: ref.offsetWidth || img.width,
              height: ref.offsetHeight || img.height,
              x: position.x ?? img.x,
              y: position.y ?? img.y,
            }
          : img
      )
    );
  };

  const handlePreview = async () => {
    const previews: string[] = [];
    for (let i = 0; i < decoAreas.length; i++) {
      setSelectedCard(i);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const areaElement = document.getElementById("tshirt-canvas");
      if (areaElement) {
        const canvas = await html2canvas(areaElement);
        previews.push(canvas.toDataURL("image/png"));
      }
    }
    setPreviewImages(previews);
    setIsPreviewModalOpen(true);
  };

  const handleDownload = (format: string) => {
    if (format === "pdf") {
      const pdf = new jsPDF();
      previewImages.forEach((image, index) => {
        if (index > 0) pdf.addPage();
        pdf.addImage(image, "PNG", 10, 10, 180, 240);
      });
      pdf.save("design_preview.pdf");
    } else {
      previewImages.forEach((image, index) => {
        const link = document.createElement("a");
        link.href = image;
        link.download = `design_preview_${index + 1}.${format}`;
        link.click();
      });
    }
  };

  const addBackgroundColor = async (imageUrl: string, backgroundColor: string): Promise<string | null> => {
    try {
      const img = document.createElement("img");
      img.crossOrigin = "Anonymous";
      img.src = imageUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Error adding background color:", error);
      return null;
    }
  };

  useEffect(() => {
    const processImage = async () => {
      const imageUrl = decoAreas[selectedCard]?.image;
      if (imageUrl) {
        const base64Image = await addBackgroundColor(imageUrl, selectedColor.selectedColor);
        setProcessedImage(base64Image);
      }
    };
    processImage();
  }, [decoAreas, selectedCard, selectedColor]);

  const saveDesignDetails = () => {
    const designData = {
      decoAreas,
      selectedCard,
      textFields,
      images: designImages,
      selectedColor,
      currentDesignElement,
    };
    localStorage.setItem("designingToolData", JSON.stringify(designData));
    const currentTime = new Date().toLocaleString();
    setSaveStatus({ status: "green", lastSaved: currentTime });
  };

  const handleBack = () => {
    saveDesignDetails();
    router.push(`/product/${slug}`);
  };

  const uploadToS3 = async (dataUrl: string, fileName: string) => {
    const base64Data = dataUrl.split(",")[1];
    const blob = base64ToBlob(base64Data, "image/png");
    const { data } = await axios.post("/api/upload-s3", {
      Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
      fileName,
      fileType: "image/png",
    });
    const { url } = data;
    await axios.put(url, blob, {
      headers: { "Content-Type": "image/png" },
    });
    return url.split("?")[0];
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteString = atob(base64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeType });
  };

  const handleNext = async () => {
    setIsLoading(true);
    const previews: string[] = [];
    const colorCountsTemp: number[] = [];
    const newS3Urls: string[] = [];
    try {
      for (let i = 0; i < decoAreas.length; i++) {
        setSelectedCard(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const areaElement = document.getElementById("tshirt-canvas");
        if (areaElement) {
          const canvas = await html2canvas(areaElement);
          const dataUrl = canvas.toDataURL("image/png");
          previews.push(dataUrl);
          const s3Url = await uploadToS3(dataUrl, `${decoAreas[i].location}-${Date.now()}.png`);
          newS3Urls.push(s3Url);
          const count = await analyzeColors(s3Url);
          colorCountsTemp.push(parseInt(count, 10));
        }
      }
      setColorCounts(colorCountsTemp);
      setUpdatedCounts([...colorCountsTemp]);
      setPreviewImages(previews);
      setS3Urls(newS3Urls);
      setIsNextModelOpen(true);
    } catch (error) {
      console.error("Error during handleNext:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToNext = () => {
    const decorationDetails = decoAreas
      .map((area: any, index: number) => {
        const baseDetails = {
          locationName: area.location,
          s3Url: s3Urls[index],
          colorCodes: colorInputs[index],
          artworkPreference: artWorkDesignDetails[index]
            ? {
                url: artWorkDesignDetails[index].url,
                name: artWorkDesignDetails[index].name,
                maxWidth: artWorkDesignDetails[index].maxWidth,
              }
            : null,
        };
        if (orderSummary.decorationTechnology === "screen-printing") {
          return { ...baseDetails, totalColorCount: updatedCounts[index] };
        } else if (orderSummary.decorationTechnology === "direct-to-garment") {
          return baseDetails;
        }
        return null;
      })
      .filter(Boolean);
    localStorage.setItem("decorationDetails", JSON.stringify(decorationDetails));
    console.log("Decoration Details:", decorationDetails);
    router.push("/order-summary");
  };

  const handleInsertArtwork = (artworkData: { url: string; name: string; file: File }, index: number) => {
    setArtWorkDesignDetails((prev) => ({ ...prev, [index]: artworkData }));
  };

  const handleUpdateColorCount = (index: number, value: number) => {
    setUpdatedCounts((prev) =>
      prev.map((count, i) => (i === index ? count + value : count))
    );
    setColorInputs((prev) => {
      const updated = { ...prev };
      if (!updated[index]) updated[index] = [];
      if (value > 0) {
        updated[index] = [...updated[index], ""];
      } else if (value < 0 && updated[index].length > 0) {
        updated[index] = updated[index].slice(0, -1);
      }
      return updated;
    });
  };

  const handleHexChange = (index: number, colorIndex: number, value: string) => {
    setColorInputs((prev) => {
      const updated = { ...prev };
      if (!updated[index]) updated[index] = [];
      updated[index][colorIndex] = value;
      return updated;
    });
  };

  const validateUniqueColors = (): string | null => {
    for (const [index, colors] of Object.entries(colorInputs)) {
      const uniqueColors = new Set(colors.filter((color) => color.trim()));
      if (uniqueColors.size !== colors.length) {
        return `Duplicate colors found in Location ${Number(index) + 1}`;
      }
    }
    return null;
  };

  const handleContinueToNextFromColor = () => {
    const validationError = validateUniqueColors();
    if (validationError) {
      setError(validationError);
      setIsColorNext(false);
      return;
    }
    setError("");
    console.log("Validation passed! Proceeding to the next step.");
    setIsColorNext(true);
  };

  const isAllArtworkDetailsPopulated = decoAreas.every((_, index) =>
    artWorkDesignDetails[index] && artWorkDesignDetails[index].url
  );

  // ----- Render -----
  return (
    <div className="bg-gray-100 min-h-screen relative flex flex-col items-center">
      <InstructionDialog />

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="loader rounded-full w-20 h-20 border-4 border-teal-500 border-t-transparent animate-spin"></div>
            <p className="text-white text-lg font-semibold">Validating your order...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between bg-white p-4 shadow-md w-full border-b border-gray-300">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center">
            <Image src="/header/logo2.webp" alt="Logo" className="w-32" />
          </Link>
          <span className="font-bold text-lg">{productData.productName}</span>
          <div
            className={`flex items-center px-5 py-1 font-bold rounded-sm ${
              saveStatus.status === "green" ? "bg-teal-700 text-white" : "bg-yellow-400 text-black"
            }`}
            title={saveStatus.lastSaved ? `Last saved at ${saveStatus.lastSaved}` : "Unsaved changes"}
          >
            {saveStatus.status === "green" ? "Saved" : "Unsaved"}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1 text-gray-500 hover:text-black font-bold" onClick={handlePreview}>
            <Eye size={20} />
            <span>Preview</span>
          </button>
          <button className="flex items-center space-x-1 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 font-bold" onClick={handleBack}>
            <ChevronLeft size={24} />
            <span>Back</span>
          </button>
          <button className="flex items-center space-x-1 bg-teal-800 text-white px-4 py-2 rounded-md hover:bg-teal-900 font-bold" onClick={handleNext}>
            <CheckCircle size={20} />
            <span>Next</span>
          </button>
        </div>
      </header>

      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-xl p-4">
            <DialogTitle>Design Preview</DialogTitle>
            <div className="flex flex-col items-center space-y-4">
              <h2 className="text-lg font-semibold text-gray-700">
                {decoAreas[currentPreviewIndex]?.location || "Unknown Location"}
              </h2>
              <div className="w-full flex justify-center">
                <img src={previewImages[currentPreviewIndex]} alt={`Preview ${currentPreviewIndex + 1}`} className="rounded-md shadow-md" />
              </div>
              <div className="flex space-x-2">
                <Button className="w-24" onClick={() => setCurrentPreviewIndex((prev) => Math.max(prev - 1, 0))} disabled={currentPreviewIndex === 0}>
                  Previous
                </Button>
                <Button
                  className="w-24"
                  onClick={() => setCurrentPreviewIndex((prev) => Math.min(prev + 1, previewImages.length - 1))}
                  disabled={currentPreviewIndex === previewImages.length - 1}
                >
                  Next
                </Button>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={() => handleDownload("pdf")}>Download PDF</Button>
              <Button onClick={() => handleDownload("png")}>Download PNG</Button>
              <Button onClick={() => handleDownload("jpg")}>Download JPG</Button>
              <Button onClick={() => handleDownload("jpeg")}>Download JPEG</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Next Model */}
      {isNextModelOpen && (
        <Dialog open={isNextModelOpen} onOpenChange={setIsNextModelOpen}>
          <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <DialogTitle>Color Count Details</DialogTitle>
            <div className="flex flex-row space-x-8 items-start w-full">
              {/* Left Section: Design Preview */}
              <div className="flex flex-col items-center justify-center w-1/2 h-full bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  {decoAreas[currentPreviewIndex]?.location || "Unknown Location"}
                </h2>
                <div className="w-full flex justify-center">
                  <img src={previewImages[currentPreviewIndex]} alt={`Preview ${currentPreviewIndex + 1}`} className="rounded-md shadow-md w-full" />
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button
                    className="w-24 bg-teal-700 hover:bg-teal-900 text-white font-semibold"
                    onClick={() => setCurrentPreviewIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentPreviewIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    className="w-24 bg-teal-700 hover:bg-teal-900 text-white font-semibold"
                    onClick={() => setCurrentPreviewIndex((prev) => Math.min(prev + 1, decoAreas.length - 1))}
                    disabled={currentPreviewIndex === decoAreas.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Right Section: Color Count / Artwork Preferences */}
              {!isColorNext ? (
                <div className="flex flex-col w-1/2 bg-white p-4 rounded-lg shadow-md">
                  <h2 className="text-2xl font-bold mb-3">Location Color Details</h2>
                  {decoAreas.map((area, index) => (
                    <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{area.location || `Location ${index + 1}`}</h3>
                      <div className="mb-4">
                        <p className="flex items-center space-x-2">
                          <strong>Detected Colors:</strong>
                          <span className="px-2 py-1 bg-gray-200 rounded-md text-gray-700">{colorCounts[index]}</span>
                          <span className="text-gray-500">|</span>
                          <strong>Total Colors:</strong>
                          <span className="px-2 py-1 bg-gray-200 rounded-md text-gray-700">{updatedCounts[index]}</span>
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4" style={{ justifyContent: "flex-start" }}>
                          {Array.from({ length: updatedCounts[index] }).map((_, colorIndex) => (
                            <div key={colorIndex} className="flex flex-col items-center space-y-2 w-24">
                              <input
                                type="text"
                                value={colorInputs[index]?.[colorIndex] || ""}
                                placeholder="#FFFFFF"
                                className="border px-2 py-1 rounded-md w-full shadow-sm"
                                onChange={(e) => handleHexChange(index, colorIndex, e.target.value)}
                              />
                              <div className="w-8 h-8 rounded-full border shadow" style={{ backgroundColor: colorInputs[index]?.[colorIndex] || "transparent" }}></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center space-x-3 mt-4">
                          <Button
                            onClick={() => handleUpdateColorCount(index, -1)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                            disabled={updatedCounts[index] < 1}
                          >
                            -
                          </Button>
                          <span className="text-lg font-bold">{updatedCounts[index]}</span>
                          <Button
                            onClick={() => handleUpdateColorCount(index, 1)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                            disabled={updatedCounts[index] > 6}
                          >
                            +
                          </Button>
                        </div>
                        {error && <p className="text-red-600 mt-3">{error}</p>}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center space-x-3 mt-8">
                    <Button
                      className="bg-teal-500 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-md shadow"
                      disabled={updatedCounts.some((count) => count > 7)}
                      onClick={handleContinueToNextFromColor}
                    >
                      Continue
                    </Button>
                    <Button variant="outline" className="border border-gray-400 text-gray-700 font-bold py-2 px-6 rounded-md" onClick={() => setIsNextModelOpen(false)}>
                      Edit Design
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col w-1/2">
                  <h2 className="text-2xl font-bold mb-3">Artwork Preferences</h2>
                  <p className="text-muted-foreground mb-4">Upload and manage artwork preferences for the selected area.</p>
                  <ArtWork onInsert={(artworkData) => handleInsertArtwork(artworkData, currentPreviewIndex)} />
                  {artWorkDesignDetails[currentPreviewIndex] ? (
                    <div className="flex flex-col space-y-4 mt-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6l-6-4H4zm2 7a1 1 0 011-1h6a1 1 0 010 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h3a1 1 0 010 2H7a1 1 0 01-1-1z" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <a
                              href={artWorkDesignDetails[currentPreviewIndex]?.url}
                              download={artWorkDesignDetails[currentPreviewIndex]?.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:text-teal-800 underline font-medium text-sm"
                            >
                              {artWorkDesignDetails[currentPreviewIndex]?.name || "Download file"}
                            </a>
                            <span className="text-gray-500 text-xs">
                              Uploaded: {new Date().toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setArtWorkDesignDetails((prev) => {
                              const newDetails = { ...prev };
                              delete newDetails[currentPreviewIndex];
                              return newDetails;
                            })
                          }
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="maxWidthInput" className="text-sm font-semibold text-gray-700 mb-2">
                          Maximum Width (in cm)
                        </label>
                        <input
                          type="number"
                          id="maxWidthInput"
                          placeholder="Enter maximum width"
                          className="border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          onChange={(e) =>
                            setArtWorkDesignDetails((prev) => ({
                              ...prev,
                              [currentPreviewIndex]: {
                                ...prev[currentPreviewIndex],
                                maxWidth: e.target.value,
                              },
                            }))
                          }
                          value={artWorkDesignDetails[currentPreviewIndex]?.maxWidth || ""}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-gray-200 rounded-lg bg-red-50 text-center">
                      <p className="text-red-700 font-semibold">Please upload your artwork design for every area</p>
                      <p className="text-gray-600 text-sm">Navigate using the Next and Previous buttons to add artwork designs.</p>
                    </div>
                  )}
                  <h2 className="text-2xl font-bold mt-2 mb-4">Review Design</h2>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-foreground" />
                      <span>Are the text and images clear and easy to read?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-foreground" />
                      <span>Do the design elements fit in the safety area?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-foreground" />
                      <span>Does the background fill out to the edges?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-foreground" />
                      <span>Is everything spelled correctly?</span>
                    </li>
                  </ul>
                  <div className="flex items-center space-x-2 mb-6">
                    <Checkbox id="approve" onClick={() => setIsChecked((prev) => !prev)} />
                    <label htmlFor="approve" className="text-sm font-medium leading-none">
                      I have reviewed and approve my design.
                    </label>
                  </div>
                  <div className="flex space-x-2">
                    <Button className="w-1/2 bg-teal-500 hover:bg-teal-700" disabled={!isChecked || !isAllArtworkDetailsPopulated} onClick={handleContinueToNext}>
                      Continue
                    </Button>
                    <Button onClick={() => setIsNextModelOpen(false)} variant="outline" className="w-1/2">
                      Edit my design
                    </Button>
                  </div>
                  {!isAllArtworkDetailsPopulated && <p className="text-red-600 mt-3">Please ensure all artwork details are populated for each location.</p>}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Toolbar for Text editing */}
      {selectedTextFieldId && activeButton === "Text" && (
        <div className="flex flex-wrap items-center justify-between bg-white p-3 shadow-lg w-[550px] border border-gray-300 rounded-md space-x-3 mt-6">
          <button onClick={handleDeleteTextField} className="text-black hover:text-red-500 rounded-md p-2 transition-all duration-150 ease-in-out" aria-label="Delete text field">
            <Trash2 size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <Select
              value={textFields.find((field) => field.id === selectedTextFieldId)?.textFieldProperties.fontFamily || "Arial"}
              onValueChange={(newFont) => updateTextFieldProperty("fontFamily", newFont)}
              aria-label="Select font"
            >
              <SelectTrigger className="bg-transparent text-gray-800 outline-none text-md font-semibold w-28">
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                {availableFonts.map((font) => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: font, fontSize: "1rem" }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            type="number"
            className="w-16 h-10 text-center text-md font-semibold border border-gray-300 rounded-lg bg-gray-100"
            min="1"
            defaultValue={fontSize}
            onChange={(e) => updateTextFieldProperty("fontSize", Number(e.target.value))}
            aria-label="Font size"
          />
          <button className={getButtonStyle(textFields.find((field) => field.id === selectedTextFieldId)?.textFieldProperties.isBold)} aria-label="Bold text field" onClick={() => updateTextFieldProperty("isBold", (prev: boolean) => !prev)}>
            <Bold size={24} />
          </button>
          <button className={getButtonStyle(textFields.find((field) => field.id === selectedTextFieldId)?.textFieldProperties.isItalic)} aria-label="Italic text field" onClick={() => updateTextFieldProperty("isItalic", (prev: boolean) => !prev)}>
            <Italic size={22} />
          </button>
          <button className={getButtonStyle(textFields.find((field) => field.id === selectedTextFieldId)?.textFieldProperties.isUnderline)} aria-label="Underline text field" onClick={() => updateTextFieldProperty("isUnderline", (prev: boolean) => !prev)}>
            <Underline size={24} />
          </button>
          <div className="relative inline-block">
            <button className="text-black rounded-md p-2 transition-all duration-150 ease-in-out" aria-label="Select text color" onClick={openColorPicker}>
              <Palette size={22} />
            </button>
            <input type="color" ref={colorInputRef} className="absolute w-8 h-8 opacity-0 cursor-pointer" aria-label="Text color picker" onChange={(e) => updateTextFieldProperty("color", e.target.value)} />
          </div>
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex flex-col items-center justify-center flex-grow mt-10 mb-10 ml-20 relative">
        <div className="relative" id="tshirt-canvas">
          <img
            src={processedImage || decoAreas[selectedCard]?.image || "/placeholder.png"}
            alt={decoAreas[selectedCard]?.location}
            className="w-[620px] h-[660px] object-cover rounded-md shadow-lg relative"
            style={{ zIndex: 1 }}
          />
          {decoAreas.map((area: any, index: number) =>
            index === selectedCard ? (
              <div id="safeZone" key={index} style={{ ...getSafeZoneStyle(area), zIndex: 1 }} />
            ) : null
          )}
          <div
            className="absolute"
            style={{
              width: `${safeZone.width}px`,
              height: `${safeZone.height}px`,
              top: `${safeZone.y}px`,
              left: `${safeZone.x}px`,
              backgroundColor: "transparent",
              zIndex: 2,
            }}
          >
            {currentDesignElement.find((design) => design.id === selectedCard)?.images.map((imageId) => {
              const image = designImages.find((img) => img.id === imageId);
              if (!image) return null;
              return (
                <Rnd
                  key={image.id}
                  bounds="parent"
                  size={{ width: image.width, height: image.height }}
                  position={{ x: image.x, y: image.y }}
                  onDragStop={(e, d) => handleImageDragStop(image.id, d)}
                  onResizeStop={(e, direction, ref, delta, position) => handleImageResizeStop(image.id, ref, position)}
                  enableResizing={{
                    top: false,
                    right: true,
                    bottom: true,
                    left: false,
                    topRight: true,
                    bottomRight: true,
                    bottomLeft: false,
                    topLeft: false,
                  }}
                  lockAspectRatio={true}
                  style={{ zIndex: 3 }}
                >
                  <img src={image.src} alt="Uploaded design" style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable="false" />
                </Rnd>
              );
            })}
            {currentDesignElement.find((design) => design.id === selectedCard)?.textFields.map((fieldId) => {
              const field = textFields.find((f) => f.id === fieldId);
              if (!field) return null;
              return (
                <Rnd key={field.id} bounds="parent" position={{ x: field.x, y: field.y }} onDragStop={(e, d) => handleDragStop(field.id, d)} style={{ zIndex: 3 }}>
                  <div
                    style={{
                      color: field.textFieldProperties.color,
                      fontSize: `${field.textFieldProperties.fontSize}px`,
                      fontFamily: field.textFieldProperties.fontFamily,
                      fontWeight: field.textFieldProperties.isBold ? "bold" : "normal",
                      fontStyle: field.textFieldProperties.isItalic ? "italic" : "normal",
                      textDecoration: field.textFieldProperties.isUnderline ? "underline" : "none",
                      cursor: "move",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {field.text}
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>
      </div>

      {/* Decoration Areas Sidebar */}
      <div className="absolute right-0 top-1/2 mt-5 transform -translate-y-1/2 p-4 w-[180px] space-y-3">
        {decoAreas.map((area: any, index: number) => (
          <div
            key={index}
            className={`flex flex-col items-center space-y-2 px-4 py-3 rounded-md border-2 cursor-pointer transition-all duration-300 ${
              index === selectedCard ? "border-teal-500 bg-teal-100 shadow-lg" : "border-teal-300 bg-white"
            }`}
            onClick={() => handleCardClick(index)}
          >
            <img src={area.mainImage} alt={area.location} className="w-24 h-24 object-cover rounded-md" style={{ backgroundColor: selectedColor.selectedColor || "transparent" }} />
            <span className={`font-semibold ${index === selectedCard ? "text-teal-700" : "text-gray-700"}`}>{area.location}</span>
          </div>
        ))}
      </div>

      {/* Left Sidebar Options */}
      <div className="absolute left-4 mt-[220px] w-[100px] bg-white p-4 shadow-md">
        <button className="flex flex-col items-center space-y-2 px-4 py-3 rounded-md w-full text-gray-500 hover:text-black font-bold" onClick={() => handleButtonClick("Text")}>
          <div className={`p-2 rounded-full ${activeButton === "Text" ? "bg-black text-white" : ""}`}>
            <Type size={20} color={activeButton === "Text" ? "white" : "black"} />
          </div>
          <span className={activeButton === "Text" ? "text-black font-bold" : "text-gray-500"}>Text</span>
        </button>
        <button className="flex flex-col items-center space-y-2 px-4 py-3 rounded-md w-full text-gray-500 hover:text-black font-bold" onClick={() => handleButtonClick("Images")}>
          <div className={`p-2 rounded-full ${activeButton === "Images" ? "bg-black text-white" : ""}`}>
            <Image size={20} color={activeButton === "Images" ? "white" : "black"} />
          </div>
          <span className={activeButton === "Images" ? "text-black font-bold" : "text-gray-500"}>Images</span>
        </button>
        <button className="flex flex-col items-center space-y-2 px-4 py-3 rounded-md w-full text-gray-500 hover:text-black font-bold" onClick={() => handleButtonClick("Color Fills")}>
          <div className={`p-2 rounded-full ${activeButton === "Color Fills" ? "bg-black text-white" : ""}`}>
            <Droplet size={20} color={activeButton === "Color Fills" ? "white" : "black"} />
          </div>
          <span className={activeButton === "Color Fills" ? "text-black font-bold" : "text-gray-500"}>Color Fills</span>
        </button>
        <button className="flex flex-col items-center space-y-2 px-4 py-3 rounded-md w-full text-gray-500 hover:text-black font-bold" onClick={() => handleButtonClick("Material Colors")}>
          <div className={`p-2 rounded-full ${activeButton === "Material Colors" ? "bg-black text-white" : ""}`}>
            <Palette size={20} color={activeButton === "Material Colors" ? "white" : "black"} />
          </div>
          <span className={activeButton === "Material Colors" ? "text-black font-bold" : "text-gray-500"}>Material Colors</span>
        </button>
      </div>

      {/* Right Sidebar Options based on active button */}
      {activeButton === "Color Fills" && (
        <div className="absolute left-[120px] mt-[220px] w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <h2 className="font-semibold text-lg mb-2 text-gray-800">Color Fill</h2>
          <p className="text-gray-600 mb-4 text-sm">Choose a color for the fill:</p>
          <div className="flex items-center space-x-3 mb-3">
            <input type="color" onChange={(e) => handleColorSelect(e.target.value)} className="w-16 h-10 cursor-pointer rounded-md border-gray-300" />
            <span className="text-gray-500 text-xs">Use the picker to select your desired color.</span>
          </div>
        </div>
      )}

      {activeButton === "Material Colors" && (
        <div className="absolute left-[120px] mt-[220px] w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <h2 className="font-semibold text-lg mb-2 text-gray-800">Material Colors</h2>
          <p className="text-gray-600 mb-3 text-sm">
            Selected color: <span className="font-medium text-gray-700">{selectedColor.selectedColorName}</span>
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {productData.ImageDetails?.map((color: any, index: number) => (
              <button
                key={color.hex || index}
                className={`w-10 h-10 rounded-full border-2 transition-transform duration-200 ${
                  color.hex === selectedColor.selectedColor ? "border-teal-500 ring-2 ring-teal-400 transform scale-110 shadow-md" : "border-gray-300 hover:border-teal-300"
                }`}
                style={{ backgroundColor: color.hex }}
                onClick={() => handleColorClick(color.hex, color.color)}
              />
            ))}
          </div>
        </div>
      )}

      {activeButton === "Images" && (
        <div className="absolute left-[120px] mt-[220px] w-[350px] bg-white border rounded-lg shadow-md p-4">
          <h2 className="font-bold text-lg mb-2">Images</h2>
          <p className="text-gray-600">Add images to your design.</p>
          <p className="text-gray-600 mb-4">Accepted formats: PNG, JPEG, JPG, WEBP.</p>
          {currentDesignElement.find((design) => design.id === selectedCard)?.images.map((imageId, index) => {
            const image = designImages.find((img) => img.id === imageId);
            if (!image) return null;
            return (
              <div key={imageId} className="mb-2 flex items-center justify-between border border-gray-300 rounded-md p-2">
                <img src={image.src} alt={`Image ${index + 1}`} className="w-20 object-cover rounded-md" />
                <button
                  onClick={() =>
                    setCurrentDesignElement((prev) =>
                      prev.map((design) =>
                        design.id === selectedCard ? { ...design, images: design.images.filter((id) => id !== imageId) } : design
                      )
                    )
                  }
                  className="text-black rounded-full p-1"
                  aria-label="Delete image"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            );
          })}
          <button
            className="bg-teal-500 text-white w-full px-3 py-2 rounded-md font-bold flex items-center justify-center hover:bg-teal-700"
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            <PlusCircle size={20} className="mr-2" /> Upload Image
          </button>
          <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>
      )}

      {activeButton === "Text" && (
        <div className="absolute left-[120px] mt-[220px] w-[350px] bg-white border rounded-lg shadow-md p-4">
          <h2 className="font-bold text-lg mb-2">Text</h2>
          <p className="text-gray-600 mb-4">Edit your text below or click on the field you would like to edit directly on your design.</p>
          {currentDesignElement.find((design) => design.id === selectedCard)?.textFields.map((fieldId) => {
            const field = textFields.find((f) => f.id === fieldId);
            if (!field) return null;
            return (
              <div key={field.id} className={`mb-2 ${selectedTextFieldId === field.id ? "border-teal-500" : ""}`} onClick={() => handleTextFieldClick(field.id)}>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={field.text}
                    onChange={(e) =>
                      setTextFields((prev) =>
                        prev.map((f) => (f.id === field.id ? { ...f, text: e.target.value } : f))
                      )
                    }
                    className="w-full border rounded-l px-2 py-1"
                  />
                  <button onClick={(e) => { e.stopPropagation(); setTextFields((prev) => prev.filter((f) => f.id !== field.id)); }} className="text-black rounded-r px-2 py-1" aria-label="Delete text field">
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            );
          })}
          <button onClick={handleNewTextField} className="bg-teal-500 text-white w-full px-3 py-2 rounded-md font-bold mb-4 mt-2 hover:bg-teal-700">
            New Text Field
          </button>
        </div>
      )}
    </div>
  );
};

export default DesigningTool;

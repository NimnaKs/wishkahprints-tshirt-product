"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Home,
  ChevronRight as ChevronRightIcon,
  Star,
  Package,
  ShoppingBag,
  User,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "@firebase/firestore";
import { RatingBox } from "@/components/RatingBox";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";

interface SizeQuantities {
  [size: string]: number;
}

export default function Component({ slug }: { slug: { productmId: string } }) {
  const router = useRouter();
  const [sizes, setSizes] = useState<SizeQuantities>({});
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [productData, setProductData] = useState<any>([]);
  const [productImages, setProductImages] = useState<any>([0]);
  const [productSizeRanges, setProductSizeRanges] = useState<any>([]);
  const [productPricingRanges, setProductPricingRanges] = useState<any>([]);
  const [printLocationTmp, setPrintLocationTmp] = useState<any>([]);
  const [selectedColor, setSelectedColor] = useState(
    productImages[0]?.hex || "#FFFFFF"
  );
  const [selectedColorName, setSelectedColorName] = useState(
    productImages[0]?.color || "white"
  );
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [reviews, setReviews] = useState<
    { rating: number; review: string; images: string[] }[]
  >([]);
  const [decorationTech, setDecorationTech] = useState("direct-to-garment");
  const [locations, setLocations] = useState<string[]>([]);
  const [decoAreas, setDecoAreas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromQty1, setFromQty1] = useState<number | null>(null);
  const [fromQty2, setFromQty2] = useState<number | null>(null);
  const [minimumQty, setMinimumQty] = useState<number>(0);
  const [materialProvider, setMaterialProvider] = useState<
    "wishkah" | "customer" | null
  >(null);
  const [startIndex, setStartIndex] = useState(0);
  const rowsToShow = 4;
  const maxStartIndex = Math.max(0, productPricingRanges.length - rowsToShow);

  useEffect(() => {
    // Set "wishkah" as the default selection when the component mounts
    setMaterialProvider("wishkah");
  }, []);

  const handleScrollUp = () => {
    setStartIndex(Math.max(0, startIndex - 1));
  };

  const handleScrollDown = () => {
    setStartIndex(Math.min(maxStartIndex, startIndex + 1));
  };

  const sizeIds = [
    ...new Set(
      productSizeRanges.flatMap((range: any) =>
        range.values.map((value: any) => value.sizeID)
      )
    ),
  ];
  const priceIds = [
    ...new Set(
      productPricingRanges.flatMap((range: any) =>
        range.prices.map((price: any) => price.sizeID)
      )
    ),
  ];

  useEffect(() => {
    fetchProduct();
    fetchQuantities();
  }, []);

  const fetchQuantities = async () => {
    try {
      // Fetch Qx8R10SQl76CwN0SUvxC
      const docRef1 = doc(db, "service_prices", "Qx8R10SQl76CwN0SUvxC");
      const docSnap1 = await getDoc(docRef1);

      let qty1 = null;
      if (docSnap1.exists()) {
        const pricesList1 = docSnap1.data()?.pricesList || [];
        if (pricesList1.length > 0) {
          qty1 = pricesList1[0]?.fromQty || null;
          setFromQty1(qty1);
        } else {
          console.error("pricesList is empty for Qx8R10SQl76CwN0SUvxC");
        }
      } else {
        console.error("No document found for Qx8R10SQl76CwN0SUvxC");
      }

      // Fetch ESC9pZo6vAyA5K8u1QJJ
      const docRef2 = doc(db, "service_prices", "ESC9pZo6vAyA5K8u1QJJ");
      const docSnap2 = await getDoc(docRef2);

      let qty2 = null;
      if (docSnap2.exists()) {
        const pricesList2 = docSnap2.data()?.pricesList || [];
        if (pricesList2.length > 0) {
          qty2 = pricesList2[0]?.fromQty || null;
          setFromQty2(qty2);
        } else {
          console.error("pricesList is empty for ESC9pZo6vAyA5K8u1QJJ");
        }
      } else {
        console.error("No document found for ESC9pZo6vAyA5K8u1QJJ");
      }

      if (qty1 !== null && qty2 !== null) {
        setMinimumQty(Math.min(qty1, qty2));
      } else if (qty1 !== null) {
        setMinimumQty(qty1);
      } else if (qty2 !== null) {
        setMinimumQty(qty2);
      }
    } catch (error) {
      console.error("Error fetching quantities:", error);
      setError("Failed to fetch quantities. Please try again.");
    }
  };

  function getIconName(location: string) {
    switch (location) {
      case "Full Front":
        return "full-front";
      case "Full Back":
        return "full-back";
      case "Left Shoulder":
        return "left-shoulder";
      case "Right Shoulder":
        return "right-shoulder";
      case "Left Chest":
        return "left-chest";
      case "Right Chest":
        return "right-chest";
      default:
        return location.toLowerCase().replace(/\s+/g, "-");
    }
  }

  const availableSizes = [
    ...new Set(
      productPricingRanges.flatMap((range) =>
        range.prices.map((price) => price.sizeID)
      )
    ),
  ];

  const handleNewReview = (newReview: {
    rating: number;
    review: string;
    images: string[];
  }) => {
    setReviews((prevReviews) => [...prevReviews, newReview]);
  };

  const fetchProduct = () => {
    try {
      const docRef = doc(db, "products", slug);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setProductData(docSnap.data());
          setProductImages(docSnap.data().ImageDetails);
          setProductSizeRanges(docSnap.data().sizeRangeTable);
          setProductPricingRanges(docSnap.data().priceRangeTable);
          const locationsData = docSnap.data().PrintTemplate?.locations || [];
          setPrintLocationTmp(locationsData);
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Error fetching document: ", e);
    }
  };

  useEffect(() => {
    if (productImages && productImages.length > 0) {
      setSelectedColor(productImages[0].hex);
      setSelectedColorName(productImages[0].color);
      setCurrentImages(productImages[0].images || []);
    }
  }, [productImages]);

  const handleColorClick = (colorHex: string, name: string) => {
    const selectedColorObj = productImages.find(
      (color: any) => color.hex === colorHex
    );
    setSelectedColor(colorHex);
    setSelectedColorName(name);
    setCurrentImages(selectedColorObj.images || []);
    setCurrentImageIndex(0);
  };

  const handleSizeChange = (size: string, quantity: number) => {
    setSizes((prevSizes) => ({
      ...prevSizes,
      [size]: quantity,
    }));
  };

  const nextImage = () => {
    if (currentImageIndex < currentImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const getUnitPrices = () => {
    const unitPrices = {};

    // Loop through each size and quantity
    for (const size in sizes) {
      const quantity = sizes[size];

      // Find the correct price range based on quantity
      const range = productPricingRanges.find(
        (range: any) =>
          quantity >= range.lowerLimit && quantity <= range.upperLimit
      );

      if (range) {
        // Get the price for the current size within this range
        const priceEntry = range.prices.find(
          (price: any) => price.sizeID === size
        );
        if (priceEntry) {
          unitPrices[size] = priceEntry.price;
        }
      }
    }

    return unitPrices;
  };

  /* New check: Verify that for each size with a quantity,
  there is a corresponding pricing range with a price available. */
  const missingPriceSizes = Object.entries(sizes).filter(([size, qty]) => {
    if (!qty || qty === 0) return false; // Skip sizes with no quantity.

    // Find a price range where the quantity fits.
    const matchingRange = productPricingRanges.find(
      (range: { lowerLimit: number; upperLimit: number }) =>
        qty >= range.lowerLimit && qty <= range.upperLimit
    );

    // If no range exists or if within that range there is no price for this size, flag it.
    if (!matchingRange) return true;
    const priceEntry = matchingRange.prices.find(
      (price: { sizeID: string }) => price.sizeID === size
    );
    return !priceEntry;
  });

  const validateInputs = () => {
    const totalQuantity = Object.values(sizes).reduce(
      (sum, qty) => sum + (qty || 0),
      0
    );

    if (totalQuantity < minimumQty) {
      setError(
        `A minimum order of ${minimumQty} pieces is required. Your total quantity is ${totalQuantity}.`
      );
      return false;
    }
    if (decoAreas.length === 0) {
      setError("Please select at least one decoration area.");
      return false;
    }
    if (
      Object.keys(sizes).length === 0 ||
      Object.values(sizes).every((q) => q === 0)
    ) {
      setError("Please add quantities for at least one size.");
      return false;
    }
    if (!selectedColor) {
      setError("Please select a color.");
      return false;
    }
    if (missingPriceSizes.length > 0) {
      const missingSizes = missingPriceSizes.map(([size]) => size).join(", ");
      setError(
        `No pricing available for quantities entered for sizes: ${missingSizes}. Please adjust quantities to match available pricing ranges.`
      );
      return false;
    }
    setError(null);
    return true;
  };

  const directToDesigner = () => {
    if (!validateInputs()) {
      return;
    }
    localStorage.setItem("productData", JSON.stringify(productData));
    const unitPrices = getUnitPrices();
    const orderSummary = {
      selectedColor: {
        color: selectedColor,
        colorName: selectedColorName,
      },
      decorationTechnology: decorationTech,
      decorationAreas: decoAreas,
      sizes: Object.keys(sizes).map((sizeType) => ({
        sizeType: sizeType,
        quantity: sizes[sizeType],
        unitPrice: unitPrices[sizeType] || 0,
      })),
    };
    localStorage.setItem("orderSummary", JSON.stringify(orderSummary));
    localStorage.setItem("decoAreas", JSON.stringify(decoAreas));
    localStorage.setItem("slug", JSON.stringify(slug));
    router.push("/designing-tool");
  };

  const handleDecorationAreaChange = (location: string) => {
    const selectedLocation = printLocationTmp?.find(
      (item) => item.location === location
    );

    setLocations((prev) => {
      if (prev.length === 1 && prev[0] === location) {
        return [];
      }
      if (prev.includes(location)) {
        return prev.filter((area) => area !== location);
      } else if (selectedLocation?.location) {
        return [...prev, selectedLocation.location];
      }
      return prev;
    });

    setDecoAreas((prev) => {
      if (prev.length === 1 && prev[0].location === location) {
        return [];
      }
      if (prev.some((area) => area.location === location)) {
        return prev.filter((area) => area.location !== location);
      } else if (selectedLocation) {
        return [...prev, selectedLocation];
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <nav
          className="flex items-center space-x-2 mb-6 text-sm text-teal-900"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="flex items-center hover:text-teal-800">
            <Home className="h-4 w-4 mr-1" />
            <span>Home</span>
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <Link href="/apparel-product" className="hover:text-teal-800">
            Apparel Product
          </Link>
          <ChevronRightIcon className="h-4 w-4" />
          <span className="font-semibold text-teal-800">
            {productData.productName}
          </span>
        </nav>

        <h1 className="text-4xl font-bold mb-8 text-teal-900">
          {productData.productName}
        </h1>

        <div>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-teal-200">
              <div className="relative aspect-square mb-4">
                <Image
                  src={currentImages[currentImageIndex] || "/placeholder.svg"}
                  alt={`Product view ${currentImageIndex + 1}`}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-teal-100"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-teal-100"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 bottom-2 bg-white/80 hover:bg-teal-100"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center mt-4 space-x-2 overflow-x-auto">
                {currentImages?.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-20 h-24 border-2 rounded-md overflow-hidden flex-shrink-0 ${
                      index === currentImageIndex
                        ? "border-teal-500"
                        : "border-teal-300"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      width={80}
                      height={96}
                      objectFit="cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-teal-200">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 text-teal-700">
                  Description
                </h3>
                <p className="text-gray-700">
                  {productData.productDescription}
                </p>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 text-teal-700">
                  Select Color
                </h3>
                <div className="flex flex-wrap gap-3">
                  {productImages?.map((color: any, index) => (
                    <button
                      key={color.hex || index}
                      className={`w-12 h-12 rounded-full border-2 transition-all ${
                        color.hex === selectedColor
                          ? "border-teal-500 ring-2 ring-teal-300"
                          : "border-teal-300 hover:border-teal-500"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => handleColorClick(color.hex, color.color)}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-700">
                  Selected: {selectedColorName}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-teal-700">
                  Pricing Chart
                </h3>
                <div className="relative">
                  <div className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white">
                          <th className="p-2 border border-gray-700">
                            Quantity Range
                          </th>
                          {priceIds.map((sizeID, index) => (
                            <th
                              key={index}
                              className="p-2 border border-gray-700"
                            >
                              {sizeID}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {productPricingRanges
                          .slice(startIndex, startIndex + rowsToShow)
                          .map((sizeRange, index) => (
                            <tr key={index} className="bg-white">
                              <td className="p-2 border border-gray-700">
                                {sizeRange.lowerLimit} - {sizeRange.upperLimit}
                              </td>
                              {priceIds.map((sizeID, idx) => {
                                const sizeValue = sizeRange.prices.find(
                                  (value) => value.sizeID === sizeID
                                );
                                return (
                                  <td
                                    key={idx}
                                    className="p-2 border border-gray-700"
                                  >
                                    <span className="w-full block px-2 py-1">
                                      {sizeValue ? `$${sizeValue.price}` : "-"}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {productPricingRanges.length > rowsToShow && (
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleScrollUp}
                        disabled={startIndex === 0}
                        className="mb-2"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleScrollDown}
                        disabled={startIndex === maxStartIndex}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Card className="mt-6">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-teal-700">
                    Sizes and Quantities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-2">
                    {availableSizes.map((size) => (
                      <div key={size} className="flex flex-col items-center">
                        <Label
                          htmlFor={`size-${size}`}
                          className="text-sm font-medium text-gray-700 mb-1"
                        >
                          {size}
                        </Label>
                        <Input
                          id={`size-${size}`}
                          value={sizes[size] || ""}
                          onChange={(e) =>
                            handleSizeChange(
                              size,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-16 text-center"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-red-500 text-sm mt-2">
                    A minimum order of{" "}
                    <span className="font-semibold">{minimumQty}</span> pieces
                    is required to proceed. Please ensure your total order meets
                    this requirement before continuing.
                  </p>
                </CardContent>
              </Card>

              <div className="py-4"></div>

              {/* New section for material provision */}
              <Card>
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-teal-700">
                    Apparel and Accessories Supply
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <Button
                      variant={
                        materialProvider === "wishkah" ? "default" : "outline"
                      }
                      className={`h-24 ${
                        materialProvider === "wishkah"
                          ? "bg-teal-800 hover:bg-teal-700 text-white"
                          : ""
                      }`}
                      onClick={() => setMaterialProvider("wishkah")}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Printer className="h-8 w-8" />
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              materialProvider === "wishkah"
                                ? "font-semibold"
                                : ""
                            }
                          >
                            Wishkah Provides
                          </span>
                          {materialProvider === "wishkah" && (
                            <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                          )}
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant={
                        materialProvider === "customer" ? "default" : "outline"
                      }
                      className={`h-24 ${
                        materialProvider === "customer"
                          ? "bg-teal-800 hover:bg-teal-700 text-white"
                          : ""
                      }`}
                      onClick={() => setMaterialProvider("customer")}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-8 w-8" />
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              materialProvider === "customer"
                                ? "font-semibold"
                                : ""
                            }
                          >
                            Customer Provides
                          </span>
                          {materialProvider === "customer" && (
                            <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                          )}
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="py-4"></div>

              <Card>
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-teal-700">
                    Decoration Technology
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div
                    onClick={() => setDecorationTech("screen-printing")}
                    className={`rounded-lg border p-4 transition-all cursor-pointer ${
                      decorationTech === "screen-printing"
                        ? "border-teal-500 shadow-sm"
                        : "border-teal-200"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <Image
                        src="/icons/screen-printing.png"
                        alt="Screen Printing"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-teal-700">
                          Screen Printing
                        </h4>
                        <p className="text-sm text-gray-700">
                          Design is printed in 1 color. Smooth, slightly raised
                          feel. Great value in bulk.
                        </p>
                      </div>
                    </div>
                    {decorationTech === "screen-printing" && (
                      <div className="space-y-3 mt-4">
                        <Label className="text-gray-700">Decoration Area</Label>
                        <div className="flex flex-wrap gap-3">
                          {printLocationTmp.map((location, index) => (
                            <Button
                              key={index}
                              variant={
                                locations.includes(location.location)
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleDecorationAreaChange(location.location)
                              }
                              className={`h-16 px-4 min-w-[140px] ${
                                locations.includes(location.location)
                                  ? "bg-teal-800 hover:bg-teal-700 text-white"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Image
                                  src={`/icons/${getIconName(
                                    location.location
                                  )}.png`}
                                  alt={location.location}
                                  width={24}
                                  height={24}
                                  className="rounded-sm"
                                />
                                <span>{location.location}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={directToDesigner}
                className="w-full mb-2 bg-teal-900 hover:bg-teal-700 mt-5"
              >
                Quick Design
              </Button>
              {error && <p className="text-red-500 text-md mt-2">{error}</p>}
            </div>
          </div>

          {/* Tabs section */}
          <Tabs defaultValue="details" className="mt-12">
            <TabsList className="bg-green-50 p-1 rounded-lg">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-teal-700 data-[state=active]:text-white"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="sizing"
                className="data-[state=active]:bg-teal-700 data-[state=active]:text-white"
              >
                Sizing Chart
              </TabsTrigger>
              <TabsTrigger
                value="fileprep"
                className="data-[state=active]:bg-teal-700 data-[state=active]:text-white"
              >
                File Prep
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:bg-teal-700 data-[state=active]:text-white"
              >
                Reviews
              </TabsTrigger>
              <TabsTrigger
                value="guidelines"
                className="data-[state=active]:bg-teal-700 data-[state=active]:text-white"
              >
                Content Guidelines
              </TabsTrigger>
              <TabsTrigger
                value="care"
                className="data-[state=active]:bg-teal-700 data-[state=active]:text-white"
              >
                Care Instructions
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="details"
              className="bg-white p-6 rounded-lg shadow-md mt-4 border border-teal-200"
            >
              <h3 className="text-xl font-semibold mb-4 text-teal-900">
                Product Details
              </h3>
              <div className="space-y-4 text-gray-700">
                <div
                  dangerouslySetInnerHTML={{ __html: productData.details }}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="sizing"
              className="bg-white p-6 rounded-lg shadow-md mt-4 border border-teal-200"
            >
              <h3 className="text-xl font-semibold mb-4 text-teal-900">
                Sizing Chart
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 border border-gray-700">Parameters</th>
                      {sizeIds.map((sizeID, index) => (
                        <th key={index} className="p-2 border border-gray-700">
                          {sizeID}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productSizeRanges.map((sizeRange, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-white"}
                      >
                        <td className="p-2 border border-gray-700 font-semibold">
                          {sizeRange.parameterID}
                        </td>
                        {sizeIds.map((sizeID, idx) => {
                          const sizeValue = sizeRange.values.find(
                            (value) => value.sizeID === sizeID
                          );
                          return (
                            <td
                              key={idx}
                              className="p-2 border border-gray-700 text-center"
                            >
                              {sizeValue ? sizeValue.value : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent
              value="fileprep"
              className="bg-white p-6 rounded-lg shadow-md mt-4 border border-green-200"
            >
              <h3 className="text-xl font-semibold mb-4 text-teal-700">
                File Preparation Guidelines
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                <li>Image file formats: PNG, JPEG, PDF</li>
                <li>Resolution: 300 DPI</li>
                <li>Color Mode: CMYK</li>
                <li>Max file size: 25 MB</li>
                <li>
                  Ensure proper alignment and bleed settings in your design
                </li>
              </ul>
            </TabsContent>

            <TabsContent
              value="reviews"
              className="bg-white p-6 rounded-lg shadow-md mt-4 border border-green-200"
            >
              <h3 className="text-xl font-semibold mb-4 text-teal-700">
                Product Reviews
              </h3>

              {reviews.length === 0 ? (
                <p className="text-gray-700">
                  No reviews yet. Be the first to leave a review!
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <div
                      key={index}
                      className="border p-4 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center mb-2">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-5 h-5 text-yellow-400 fill-yellow-400"
                          />
                        ))}
                      </div>
                      <p className="text-green-800">{review.review}</p>
                      {review.images.length > 0 && (
                        <div className="flex space-x-4 mt-2">
                          {review.images.map((image, i) => (
                            <img
                              key={i}
                              src={image}
                              alt={`Review Image ${i + 1}`}
                              className="h-24 w-24 object-cover rounded-md"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <RatingBox onSubmit={handleNewReview} />
            </TabsContent>

            <TabsContent
              value="guidelines"
              className="bg-white p-6 rounded-lg shadow-md mt-4 border border-green-200"
            >
              <h3 className="text-xl font-semibold mb-4 text-teal-700">
                Content Guidelines
              </h3>
              <div
                className="text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: productData.contentGuidelines,
                }}
              />
            </TabsContent>

            <TabsContent
              value="care"
              className="bg-white p-6 rounded-lg shadow-md mt-4 border border-green-200"
            >
              <h3 className="text-xl font-semibold mb-4 text-teal-700">
                Care Instructions
              </h3>
              <div
                className="text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: productData.careInstructions,
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

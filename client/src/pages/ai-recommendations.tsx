import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/api";
import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Palette, MapPin, Ruler, Droplets, Info, Loader2, CheckCircle2 } from "lucide-react";

const TATTOO_STYLES = [
  "Traditional",
  "Neo-Traditional", 
  "Japanese",
  "Realism",
  "Watercolor",
  "Geometric",
  "Minimalist",
  "Blackwork",
  "Dotwork",
  "Tribal",
  "New School",
  "Biomechanical",
];

const PLACEMENTS = [
  "Arm (Upper)",
  "Arm (Forearm)",
  "Arm (Full Sleeve)",
  "Back",
  "Chest",
  "Shoulder",
  "Leg (Thigh)",
  "Leg (Calf)",
  "Ribs",
  "Neck",
  "Hand",
  "Wrist",
  "Ankle",
  "Foot",
];

const SIZES = [
  "Tiny (1-2 inches)",
  "Small (2-4 inches)",
  "Medium (4-6 inches)",
  "Large (6-10 inches)",
  "Extra Large (10+ inches)",
  "Full Sleeve",
  "Half Sleeve",
  "Back Piece",
];

interface TattooRecommendation {
  styles: string[];
  placement: string[];
  size: string;
  colors: string[];
  description: string;
  aftercareTips: string[];
}

export default function AIRecommendations() {
  const { token } = useAuth();
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("");
  const [placement, setPlacement] = useState("");
  const [size, setSize] = useState("");
  const [recommendation, setRecommendation] = useState<TattooRecommendation | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/ai/tattoo-recommendations",
        { description, style, placement, size },
        token!
      );
      return response.json();
    },
    onSuccess: (data) => {
      setRecommendation(data);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <main className="lg:ml-64 pb-20 lg:pb-8 pt-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" data-testid="page-title">AI Recommendations</h1>
            <p className="text-sm text-muted-foreground">
              Get personalized tattoo design recommendations powered by AI
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Your Preferences</CardTitle>
                <CardDescription>Tell us what you're looking for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Describe your idea
                  </label>
                  <Textarea
                    placeholder="E.g., A dragon wrapping around a sword with cherry blossoms..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    data-testid="input-description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preferred Style
                  </label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger data-testid="select-style">
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Open to suggestions</SelectItem>
                      {TATTOO_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preferred Placement
                  </label>
                  <Select value={placement} onValueChange={setPlacement}>
                    <SelectTrigger data-testid="select-placement">
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Open to suggestions</SelectItem>
                      {PLACEMENTS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preferred Size
                  </label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger data-testid="select-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Open to suggestions</SelectItem>
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || !description.trim()}
                  className="w-full gap-2"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Get Recommendations
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div>
              {generateMutation.isError && (
                <Card className="border-destructive bg-destructive/10 mb-4">
                  <CardContent className="pt-6">
                    <p className="text-destructive text-sm">
                      {generateMutation.error?.message || "Failed to generate recommendations. Please try again."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {recommendation ? (
                <Card data-testid="recommendation-result">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Your Personalized Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Recommended Styles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.styles.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Placement Suggestions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.placement.map((p) => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Ruler className="w-4 h-4" />
                        Recommended Size
                      </h4>
                      <p className="text-muted-foreground">{recommendation.size}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        Color Palette
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.colors.map((c) => (
                          <Badge key={c} variant="secondary">{c}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Design Description</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {recommendation.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Aftercare Tips
                      </h4>
                      <ul className="space-y-2">
                        {recommendation.aftercareTips.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary font-medium">{i + 1}.</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="py-16 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Ready to explore?</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Describe your tattoo idea and our AI will provide personalized style, 
                      placement, and design recommendations.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

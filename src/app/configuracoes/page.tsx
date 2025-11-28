"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, FileText, Phone, Mail, MapPin, Upload, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  id: string;
  cityName: string;
  stateName: string | null;
  secretaryName: string | null;
  lawsText: string | null;
  logoUrl: string | null;
  sublimitEstadual: number;
  sublimitMunicipal: number;
  address: string | null;
  phone: string | null;
  email: string | null;
  updatedAt: string;
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso",
        });
        loadSettings();
      } else {
        throw new Error("Erro ao salvar configurações");
      }
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        setSettings({ ...settings!, logoUrl: url });
        toast({
          title: "Sucesso",
          description: "Logo enviado com sucesso",
        });
      } else {
        throw new Error("Erro ao fazer upload");
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Erro ao carregar configurações</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Configure os dados da prefeitura e parâmetros do sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
          <TabsTrigger value="contato">Contato</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Identificação da Prefeitura
              </CardTitle>
              <CardDescription>
                Informações básicas da prefeitura e da secretaria de fazenda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cityName">Nome do Município *</Label>
                <Input
                  id="cityName"
                  value={settings.cityName}
                  onChange={(e) =>
                    setSettings({ ...settings, cityName: e.target.value })
                  }
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stateName">Estado</Label>
                <Input
                  id="stateName"
                  value={settings.stateName || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, stateName: e.target.value })
                  }
                  placeholder="Ex: São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretaryName">Nome do Secretário de Fazenda</Label>
                <Input
                  id="secretaryName"
                  value={settings.secretaryName || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, secretaryName: e.target.value })
                  }
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Brasão da Prefeitura</Label>
                <div className="flex items-center gap-4">
                  {settings.logoUrl && (
                    <img
                      src={settings.logoUrl}
                      alt="Brasão"
                      className="h-20 w-20 object-contain border rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lawsText">Legislação Municipal (ISS)</Label>
                <textarea
                  id="lawsText"
                  value={settings.lawsText || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, lawsText: e.target.value })
                  }
                  placeholder="Ex: Lei Complementar nº 123/2006, Lei Municipal nº 456/2020..."
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Descreva as principais leis municipais relacionadas ao ISS
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contato" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Informações de Contato
              </CardTitle>
              <CardDescription>
                Dados para contato com a secretaria de fazenda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </Label>
                <Input
                  id="address"
                  value={settings.address || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  placeholder="Ex: Rua XV de Novembro, 100 - Centro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={settings.phone || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                  placeholder="Ex: (11) 3456-7890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                  placeholder="Ex: fazenda@prefeitura.gov.br"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parametros" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Parâmetros Tributários
              </CardTitle>
              <CardDescription>
                Limites e valores utilizados nas validações do Simples Nacional
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Sublimites do Simples Nacional</h3>
                <p className="text-sm text-muted-foreground">
                  Valores de faturamento anual que determinam a necessidade de recolhimento do ISS em
                  guia separada conforme a legislação municipal.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sublimitEstadual">
                  Sublimite Estadual (R$)
                </Label>
                <Input
                  id="sublimitEstadual"
                  type="number"
                  value={settings.sublimitEstadual}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sublimitEstadual: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Valor padrão: R$ 3.600.000,00 (conforme LC 123/2006)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sublimitMunicipal">
                  Sublimite Municipal (R$)
                </Label>
                <Input
                  id="sublimitMunicipal"
                  type="number"
                  value={settings.sublimitMunicipal}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sublimitMunicipal: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Valor padrão: R$ 4.800.000,00 (conforme legislação municipal)
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                  ℹ️ Informação
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  O sistema utilizará esses valores para identificar contribuintes que ultrapassaram
                  o sublimite e devem recolher o ISS em guia separada. Empresas com faturamento acima
                  desses limites serão destacadas nos relatórios de cruzamento.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Todas as Alterações"}
        </Button>
      </div>
    </div>
  );
}

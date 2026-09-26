"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registrarCadastroDeSegundoFator } from "./acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Cadastro = { factorId: string; qrCode: string; secret: string };

export function SegundoFator({ cadastrando }: { cadastrando: boolean }) {
  const [supabase] = useState(createSupabaseBrowserClient);

  const [cadastro, setCadastro] = useState<Cadastro | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function preparar() {
      const { data: fatores, error } = await supabase.auth.mfa.listFactors();

      if (error || cancelado) return;

      const verificado = fatores.totp.at(0);

      if (verificado && !cadastrando) {
        setFactorId(verificado.id);
        return;
      }

      if (verificado && cadastrando) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/verificacao");
        return;
      }

      // Um cadastro interrompido deixa o fator pendente para trás. Removê-lo
      // evita acumular fatores mortos a cada visita a esta tela.
      const pendente = fatores.all.find(
        (fator) => fator.factor_type === "totp" && fator.status === "unverified"
      );

      if (pendente) await supabase.auth.mfa.unenroll({ factorId: pendente.id });

      const { data, error: falha } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "CheckRoom",
      });

      if (falha || cancelado) {
        setErro("Não foi possível iniciar o cadastro. Recarregue a página.");
        return;
      }

      setCadastro({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setFactorId(data.id);
    }

    void preparar();

    return () => {
      cancelado = true;
    };
  }, [supabase, cadastrando]);

  async function verificar() {
    if (!factorId) return;

    setOcupado(true);
    setErro(null);

    const desafio = await supabase.auth.mfa.challenge({ factorId });

    if (desafio.error) {
      setErro("Não foi possível verificar agora. Tente novamente.");
      setOcupado(false);
      return;
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: desafio.data.id,
      code: codigo,
    });

    if (error) {
      setErro(
        "Código incorreto ou expirado. O código muda a cada 30 segundos."
      );
      setCodigo("");
      setOcupado(false);
      return;
    }

    if (cadastro) {
      await registrarCadastroDeSegundoFator().catch(() => {
        // Auditoria não pode impedir o acesso de quem acabou de se verificar.
      });
    }

    // Navegação dura, e não router: a sessão acabou de mudar, e só uma
    // requisição nova leva o cookie renovado ao middleware.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/reservas");
  }

  return (
    <div className="space-y-6">
      {cadastro && (
        <div className="flex flex-col items-center gap-4">
          {/* next/image recusa data URI, e o QR chega como SVG embutido.
              Otimizar não faria sentido: a imagem já vem pronta e inline. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cadastro.qrCode}
            alt="QR code para o aplicativo autenticador"
            width={180}
            height={180}
            className="rounded border bg-white p-2"
          />

          <details className="w-full text-center">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
              Não consigo escanear
            </summary>
            <code className="mt-2 block break-all text-xs">
              {cadastro.secret}
            </code>
          </details>
        </div>
      )}

      <form
        className="space-y-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          void verificar();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="codigo">Código de seis dígitos</Label>
          <Input
            id="codigo"
            name="codigo"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.trim())}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center text-lg tracking-[0.5em]"
            autoFocus
            required
          />
        </div>

        {erro && (
          <p className="text-destructive text-sm" role="alert">
            {erro}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={ocupado || !factorId || codigo.length !== 6}
        >
          {ocupado ? "Verificando..." : "Verificar"}
        </Button>
      </form>
    </div>
  );
}

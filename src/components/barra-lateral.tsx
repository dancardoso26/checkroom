"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronsUpDown,
  CircleHelp,
  ExternalLink,
  LogOut,
  ScrollText,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { sair } from "@/app/login/acoes";
import { ROTULO_DO_PAPEL, type Papel } from "@/domain/auth/permissoes";
import { Logo } from "@/components/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type Item = { href: string; rotulo: string; icone: LucideIcon };

const DOCUMENTOS = [
  { href: "/privacidade", rotulo: "Política de Privacidade" },
  { href: "/termos", rotulo: "Termos de Uso" },
];

const OPCOES_DE_CONFIGURACAO: Item[] = [
  { href: "/configuracoes/usuarios", rotulo: "Usuários", icone: Users },
];

// A tela de onde se entrou nas configurações, com a query: voltar para a agenda
// devolve a mesma semana e o mesmo filtro. Sem ela, volta às reservas.
const CHAVE_DO_RETORNO = "checkroom:retorno-das-configuracoes";

function guardarRetorno() {
  try {
    sessionStorage.setItem(
      CHAVE_DO_RETORNO,
      location.pathname + location.search
    );
  } catch {
    // Sem armazenamento, o Voltar cai no padrão.
  }
}

function lerRetorno(): string {
  try {
    return sessionStorage.getItem(CHAVE_DO_RETORNO) ?? "/reservas";
  } catch {
    return "/reservas";
  }
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export function BarraLateral({
  nome,
  papel,
  ehAdmin,
}: {
  nome: string;
  papel: string;
  ehAdmin: boolean;
}) {
  const caminho = usePathname();
  const router = useRouter();
  const emConfiguracoes = caminho.startsWith("/configuracoes");

  // Auditoria e configurações só aparecem para a administração. As rotas recusam
  // por conta própria: esconder o item é conveniência, não controle de acesso.
  const itens: Item[] = [
    { href: "/reservas", rotulo: "Reservas", icone: CalendarDays },
    ...(ehAdmin
      ? [
          {
            href: "/auditoria",
            rotulo: "Trilha de auditoria",
            icone: ScrollText,
          },
        ]
      : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/reservas"
          aria-label="Página inicial do CheckRoom"
          className="flex h-10 items-center px-2"
        >
          <Logo altura={24} className="group-data-[collapsible=icon]:hidden" />
          {/* Recolhida, a barra só comporta o símbolo, e não o nome inteiro. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favico-checkroom.svg"
            alt=""
            className="hidden size-6 group-data-[collapsible=icon]:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {emConfiguracoes ? (
          // Nas configurações, a barra troca de conteúdo em vez de empilhar um
          // segundo menu dentro da página.
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Voltar"
                  onClick={() => router.push(lerRetorno())}
                >
                  <ArrowLeft />
                  <span>Voltar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarGroupLabel className="mt-2">
              Configurações
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <Menu itens={OPCOES_DE_CONFIGURACAO} caminho={caminho} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <Menu itens={itens} caminho={caminho} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" aria-label={`Conta de ${nome}`}>
                  <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                    {iniciais(nome)}
                  </span>
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{nome}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {ROTULO_DO_PAPEL[papel as Papel] ?? papel}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{nome}</p>
                  <p className="text-muted-foreground text-xs">
                    {ROTULO_DO_PAPEL[papel as Papel] ?? papel}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/conta">
                    <UserCog aria-hidden className="size-4" />
                    Minha conta
                  </Link>
                </DropdownMenuItem>
                {ehAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/configuracoes" onClick={guardarRetorno}>
                      <Settings aria-hidden className="size-4" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <CircleHelp aria-hidden className="size-4" />
                    Saiba mais
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {/* Em outra aba: quem está no meio de uma reserva não perde
                        a tela para ler o documento. */}
                    {DOCUMENTOS.map(({ href, rotulo }) => (
                      <DropdownMenuItem key={href} asChild>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {rotulo}
                          <ExternalLink
                            aria-hidden
                            className="text-muted-foreground ml-auto size-4"
                          />
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => startTransition(() => void sair())}
                >
                  <LogOut aria-hidden className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function Menu({ itens, caminho }: { itens: Item[]; caminho: string }) {
  return (
    <SidebarMenu>
      {itens.map(({ href, rotulo, icone: Icone }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            asChild
            tooltip={rotulo}
            isActive={caminho.startsWith(href)}
          >
            <Link href={href}>
              <Icone />
              <span>{rotulo}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ChevronsUpDown,
  CircleHelp,
  DoorOpen,
  ExternalLink,
  GraduationCap,
  LifeBuoy,
  LogOut,
  Package,
  Presentation,
  ScrollText,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { sair } from "@/app/login/acoes";
import {
  ROTULO_DO_PAPEL,
  podeAbrirChamado,
  podeGerenciarCadastros,
  podeVerPainel,
  podeVerAgenda,
  podeVerPalestras,
  podeVerTodosOsChamados,
  type Ator,
  type Papel,
} from "@/domain/auth/permissoes";
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
  SidebarSeparator,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type Item = { href: string; rotulo: string; icone: LucideIcon };

function atorDoPapel(papel: Papel): Ator {
  return { papel, profileId: "", professorId: null };
}

function itensDoPapel(papel: Papel): Item[] {
  const ator = atorDoPapel(papel);

  return [
    {
      href: "/dashboard",
      rotulo: "Dashboard",
      icone: ChartColumn,
      ver: podeVerPainel(ator),
    },
    {
      href: "/reservas",
      rotulo: papel === "student" ? "Minha agenda" : "Reservas",
      icone: CalendarDays,
      ver: podeVerAgenda(ator),
    },
    {
      href: "/chamados",
      rotulo: "Chamados",
      icone: LifeBuoy,
      ver: podeAbrirChamado(ator) || podeVerTodosOsChamados(ator),
    },
    {
      href: "/palestras",
      rotulo: "Palestras",
      icone: Presentation,
      ver: podeVerPalestras(ator),
    },
  ]
    .filter((item) => item.ver)
    .map(({ href, rotulo, icone }) => ({ href, rotulo, icone }));
}

function veConfiguracoes(papel: Papel): boolean {
  return podeGerenciarCadastros(atorDoPapel(papel));
}

const DOCUMENTOS = [
  { href: "/privacidade", rotulo: "Política de Privacidade" },
  { href: "/termos", rotulo: "Termos de Uso" },
];

const OPCOES_DE_CONFIGURACAO: Item[] = [
  { href: "/configuracoes/usuarios", rotulo: "Usuários", icone: Users },
  { href: "/configuracoes/espacos", rotulo: "Espaços", icone: DoorOpen },
  { href: "/configuracoes/recursos", rotulo: "Recursos", icone: Package },
  {
    href: "/configuracoes/academico",
    rotulo: "Cadastro acadêmico",
    icone: GraduationCap,
  },
  {
    href: "/configuracoes/calendario",
    rotulo: "Calendário letivo",
    icone: CalendarRange,
  },
  {
    href: "/configuracoes/auditoria",
    rotulo: "Log de auditoria",
    icone: ScrollText,
  },
];

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
  semSegundoFator,
}: {
  nome: string;
  papel: Papel;
  semSegundoFator: boolean;
}) {
  const caminho = usePathname();
  const router = useRouter();
  const emConfiguracoes = caminho.startsWith("/configuracoes");

  const itens = itensDoPapel(papel);
  const ehAdmin = veConfiguracoes(papel);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center justify-between gap-2 pl-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
          <Link
            href="/reservas"
            aria-label="Página inicial do CheckRoom"
            className="flex items-center group-data-[collapsible=icon]:hidden"
          >
            <Logo altura={24} />
          </Link>
          <SidebarTrigger className="text-muted-foreground hidden md:inline-flex" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {emConfiguracoes ? (
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  tooltip="Voltar"
                  aria-label="Voltar"
                  className="relative cursor-pointer"
                  onClick={() => router.push("/reservas")}
                >
                  <ArrowLeft />
                  <span className="absolute inset-x-0 text-center group-data-[collapsible=icon]:hidden">
                    Voltar
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator className="mx-0 my-2 hidden group-data-[collapsible=icon]:block" />
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
        {semSegundoFator && (
          <p className="border-warning/40 bg-warning-subtle text-warning mx-2 rounded-md border px-2.5 py-1.5 text-xs font-medium group-data-[collapsible=icon]:hidden">
            Segundo fator dispensado neste ambiente
          </p>
        )}
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
                      {ROTULO_DO_PAPEL[papel]}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{nome}</p>
                  <p className="text-muted-foreground text-xs">
                    {ROTULO_DO_PAPEL[papel]}
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
                    <Link href="/configuracoes">
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

import '@ant-design/v5-patch-for-react-19';
import './globals.css';

import _ from 'lodash';
import { Geist, Geist_Mono } from 'next/font/google';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";

import LayoutContent from '@/components/grid-systems/LayoutContent';
import { LayoutProvider } from '@/context/LayoutContext';
import { ApiStoreProvider } from '@/providers';
import AntdProvider from '@/providers/AntdProvider';
import ReactQueryProvider from '@/providers/QueryClient';
import { MetadataIcon } from '@/types/seo';
import { Providers } from '@/components/provider/session-provider';
import { ThemeProvider } from "@/context/ThemeContext";

import { fetchMetadata } from './actions/server';
import { SidebarProvider } from '@/context/SidebarContext';

const DEFAULT_ICONS = {
  icon: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/metadata-5381957-4568609.png?f=webp',
  shortcut:
    'https://cdn.iconscout.com/icon/premium/png-256-thumb/metadata-5381957-4568609.png?f=webp',
  apple: 'https://cdn.iconscout.com/icon/premium/png-256-thumb/metadata-5381957-4568609.png?f=webp',
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata({ params, searchParams }: { params: any; searchParams: any }): Promise<Metadata> {
  const pathname = params?.slug ? `/${params.slug.join('/')}` : '/';

  let metadata;
  try {
    metadata = await fetchMetadata(pathname);
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    metadata = null;
  }

  const formMetadata = _.get(metadata, 'data.form');

  const baseMetadata: any = {
    title: {
      default: 'NextJS PAGE',
      template: '%s | NextJS PAGE',
    },
    description: 'NextJS 15',
    icons: DEFAULT_ICONS,
  };

  if (!formMetadata) {
    return baseMetadata;
  }

  return {
    title: {
      default: formMetadata?.title?.default || baseMetadata.title.default,
      template: formMetadata?.title?.template || baseMetadata.title.template,
    },
    description: formMetadata?.description || baseMetadata.description,
    keywords: formMetadata?.keywords,
    authors: formMetadata?.authors?.map((author: any) => ({
      name: author.name,
      url: author.url,
    })),
    openGraph: {
      title:
        formMetadata?.openGraph?.title ||
        formMetadata?.title?.default ||
        baseMetadata.title.default,
      description:
        formMetadata?.openGraph?.description ||
        formMetadata?.description ||
        baseMetadata.description,
      url: formMetadata?.openGraph?.url,
      siteName: formMetadata?.openGraph?.siteName,
      images: formMetadata?.openGraph?.images?.map((image: any) => ({
        url: image?.url,
        width: image?.width,
        height: image?.height,
        alt: image?.alt,
        secureUrl: image?.secure_url,
        type: image?.type || 'image/jpeg',
      })),
      locale: formMetadata?.openGraph?.locale || 'en_US',
      type: formMetadata?.openGraph?.type || 'website',
      modifiedTime: formMetadata?.openGraph?.updated_time,
    },
    twitter: {
      card: formMetadata?.twitter?.card || 'summary',
      title: formMetadata?.twitter?.title || formMetadata?.title?.default,
      description: formMetadata?.twitter?.description || formMetadata?.description,
      images: formMetadata?.twitter?.images,
    },
    robots: {
      index: formMetadata?.robots?.index ?? true,
      follow: formMetadata?.robots?.follow ?? true,
      nocache: formMetadata?.robots?.nocache,
      'max-snippet': formMetadata?.robots?.maxSnippet,
      'max-video-preview': formMetadata?.robots?.maxVideoPreview,
      'max-image-preview': formMetadata?.robots?.maxImagePreview,
      googleBot: formMetadata?.robots?.googleBot
        ? {
          index: formMetadata?.robots?.googleBot?.index,
          follow: formMetadata?.robots?.googleBot?.follow,
          noimageindex: formMetadata?.robots?.googleBot?.noimageindex,
        }
        : undefined,
    },
    alternates: {
      canonical: formMetadata?.alternates?.canonical,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const pathname = headerList.get('x-path-name');
  const metadata: MetadataIcon = await fetchMetadata(pathname || '');

  // Safely access metadata
  const formMetadata = metadata?.data?.form || {};
  const iconUrl = formMetadata?.icon?.icon || '/favicon.ico';
  const appleIcon = formMetadata?.icon?.apple || '/apple-icon.png';
  const shortcutIcon = formMetadata?.icon?.shortcut || '/shortcut-icon.png';

  return (
    <html lang="en">
      <head>
        {/* Fallback icons trong trường hợp metadata không load được */}
        <link rel="icon" href={iconUrl || DEFAULT_ICONS.icon} />
        <link rel="shortcut icon" href={appleIcon || DEFAULT_ICONS.shortcut} />
        <link rel="apple-touch-icon" href={shortcutIcon || DEFAULT_ICONS.apple} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ReactQueryProvider>
            <SidebarProvider>
              <ApiStoreProvider>
                <LayoutProvider>
                  <LayoutContent>
                    <AntdProvider>
                      <Providers>
                        {children}
                      </Providers>
                    </AntdProvider>
                  </LayoutContent>
                </LayoutProvider>
              </ApiStoreProvider>
            </SidebarProvider>
          </ReactQueryProvider>
        </ThemeProvider>

      </body>
    </html>
  );
}

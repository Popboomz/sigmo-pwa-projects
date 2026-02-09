'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Home, User, Package, Zap, FlaskConical, Cpu, CheckCircle, Clock, Eye, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ScrollAnimationController } from '@/components/ScrollAnimation';
import { useLanguage } from '@/contexts/LanguageContext';

const productLineKeys = ['core', 'x', 'lab'] as const;

interface Product {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'limited' | 'comingSoon';
}

interface ProductLine {
  name: string;
  badge: string;
  description: string;
  products: Product[];
}

export default function CollectionPage() {
  const [isClient, setIsClient] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const productLines: Record<string, ProductLine> = {
    core: {
      name: t('collection.core.name'),
      badge: t('collection.core.badge'),
      description: t('collection.core.description'),
      products: [
        {
          id: 'Σ-01',
          name: t('collection.core.products.0.name'),
          description: t('collection.core.products.0.description'),
          status: t('collection.core.products.0.status') as any,
        },
        {
          id: 'Σ-02',
          name: t('collection.core.products.1.name'),
          description: t('collection.core.products.1.description'),
          status: t('collection.core.products.1.status') as any,
        },
      ],
    },
    x: {
      name: t('collection.x.name'),
      badge: t('collection.x.badge'),
      description: t('collection.x.description'),
      products: [
        {
          id: 'Δ-01',
          name: t('collection.x.products.0.name'),
          description: t('collection.x.products.0.description'),
          status: t('collection.x.products.0.status') as any,
        },
        {
          id: 'Δ-02',
          name: t('collection.x.products.1.name'),
          description: t('collection.x.products.1.description'),
          status: t('collection.x.products.1.status') as any,
        },
      ],
    },
    lab: {
      name: t('collection.lab.name'),
      badge: t('collection.lab.badge'),
      description: t('collection.lab.description'),
      products: [
        {
          id: 'EXP-01',
          name: t('collection.lab.products.0.name'),
          description: t('collection.lab.products.0.description'),
          status: t('collection.lab.products.0.status') as any,
        },
        {
          id: 'EXP-02',
          name: t('collection.lab.products.1.name'),
          description: t('collection.lab.products.1.description'),
          status: t('collection.lab.products.1.status') as any,
        },
      ],
    },
  };

  const getStatusVariant = (status: string) => {
    if (status === 'available') return 'default';
    if (status === 'limited') return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'available') return CheckCircle;
    if (status === 'limited') return Clock;
    return Eye;
  };

  const getProductLineColor = (lineKey: string) => {
    switch (lineKey) {
      case 'core':
        return {
          bg: 'bg-primary/10',
          text: 'text-primary',
          border: 'border-primary/20',
          hover: 'hover:bg-primary/5 hover:border-primary/30',
        };
      case 'x':
        return {
          bg: 'bg-accent/10',
          text: 'text-accent',
          border: 'border-accent/20',
          hover: 'hover:bg-accent/5 hover:border-accent/30',
        };
      case 'lab':
        return {
          bg: 'bg-interactive/10',
          text: 'text-interactive',
          border: 'border-interactive/20',
          hover: 'hover:bg-interactive/5 hover:border-interactive/30',
        };
      default:
        return {
          bg: 'bg-primary/10',
          text: 'text-primary',
          border: 'border-primary/20',
          hover: 'hover:bg-primary/5 hover:border-primary/30',
        };
    }
  };

  const getProductLineIcon = (lineKey: string) => {
    switch (lineKey) {
      case 'core':
        return Cpu;
      case 'x':
        return Zap;
      case 'lab':
        return FlaskConical;
      default:
        return Package;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ScrollAnimationController />
      {/* Navigation - Floating Glassmorphism */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[1200px] glass rounded-2xl shadow-sm z-50 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105 navbar-logo">
              <span className="text-2xl text-primary font-display font-bold">Σ</span>
            </div>
            <div className="font-display font-bold text-xl tracking-tight text-primary">
              {isClient ? t('nav.brand') : 'SIGMÖ'}
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2">
            <Link href="/" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.home')}</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 bg-primary/5 text-primary transition-all duration-300 px-3 py-2 relative nav-link" disabled>
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t('nav.collection')}</span>
            </Button>
            <Link href="/account" className="group">
              <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 text-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 px-3 py-2 relative nav-link">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{t('nav.account')}</span>
              </Button>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 pt-32">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-primary mb-4">
            {t('collection.title')}
          </h1>
          <p className="font-body text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            {t('collection.subtitle')}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t('collection.modraArchitecture')}</span>
          </div>
        </div>

        {/* Product Lines */}
        <div className="space-y-16 pt-20">
          {productLineKeys.map((lineKey, index) => {
            const productLine = productLines[lineKey];
            const colors = getProductLineColor(lineKey);
            const LineIcon = getProductLineIcon(lineKey);

            return (
              <div key={lineKey} className="scroll-mt-32 product-line product-line--{lineKey} animate-on-scroll" style={{ animationDelay: `${index * 0.2}s` }} id={`line-${lineKey}`}>
                {/* Product Line Header with Different Gradients */}
                <div
                  className={`rounded-2xl p-8 md:p-12 mb-8 transition-all duration-300 hover:shadow-md`}
                  style={{
                    background: lineKey === 'core'
                      ? 'linear-gradient(135deg, rgba(107, 142, 111, 0.08) 0%, rgba(107, 142, 111, 0.02) 100%)'
                      : lineKey === 'x'
                      ? 'linear-gradient(135deg, rgba(197, 165, 114, 0.1) 0%, rgba(197, 165, 114, 0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(212, 165, 165, 0.1) 0%, rgba(212, 165, 165, 0.02) 100%)',
                    border: `1px solid ${lineKey === 'core' ? 'rgba(107, 142, 111, 0.15)' : lineKey === 'x' ? 'rgba(197, 165, 114, 0.2)' : 'rgba(212, 165, 165, 0.2)'}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ boxShadow: lineKey === 'core' ? '0 4px 16px rgba(107, 142, 111, 0.15)' : lineKey === 'x' ? '0 4px 16px rgba(197, 165, 114, 0.15)' : '0 4px 16px rgba(212, 165, 165, 0.15)' }}
                    >
                      <LineIcon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">
                          {productLine.name}
                        </h2>
                        <Badge
                          className={`rounded-full px-4 py-1.5 flex items-center gap-1.5`}
                          style={{
                            background: lineKey === 'core'
                              ? 'linear-gradient(135deg, #6B8E6F, #8FB89F)'
                              : lineKey === 'x'
                              ? 'linear-gradient(135deg, #C5A572, #D4B887)'
                              : 'linear-gradient(135deg, #D4A5A5, #E0B8B8)',
                            color: 'white',
                          }}
                        >
                          {productLine.badge}
                        </Badge>
                      </div>
                      <p className="font-body text-base text-muted-foreground leading-relaxed">
                        {productLine.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {productLine.products.map((product, productIndex) => {
                    const StatusIcon = getStatusIcon(product.status);
                    const productColors = getProductLineColor(lineKey);

                    return (
                      <div
                        key={product.id}
                        className={`card-base bg-white overflow-hidden relative group animate-on-scroll`}
                        style={{ animationDelay: `${(index * 3 + productIndex) * 0.1}s` }}
                      >
                        {/* Left Decorative Bar */}
                        <div
                          className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full opacity-0 transform scale-y-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-y-100"
                          style={{
                            background: lineKey === 'core'
                              ? 'linear-gradient(180deg, #6B8E6F, #C5A572)'
                              : lineKey === 'x'
                              ? 'linear-gradient(180deg, #C5A572, #D4A5A5)'
                              : 'linear-gradient(180deg, #D4A5A5, #8FB89F)',
                          }}
                        />

                        {/* Shimmer Effect */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div
                            className="absolute top-0 left-0 w-full h-full"
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                              animation: 'shimmer 1.5s ease-in-out',
                            }}
                          />
                        </div>

                        <div className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <Badge
                              className={`rounded-full px-4 py-1.5 flex items-center gap-1.5 text-xs font-semibold`}
                              style={{
                                background: lineKey === 'core'
                                  ? 'linear-gradient(135deg, #6B8E6F, #8FB89F)'
                                  : lineKey === 'x'
                                  ? 'linear-gradient(135deg, #C5A572, #D4B887)'
                                  : 'linear-gradient(135deg, #D4A5A5, #E0B8B8)',
                                color: 'white',
                              }}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {t(`collection.status.${product.status}`)}
                            </Badge>
                            <span
                              className="text-xs font-mono text-muted-foreground opacity-60"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {product.id}
                            </span>
                          </div>

                          <h3
                            className="font-display text-xl font-semibold text-primary mb-2"
                          >
                            {product.name}
                          </h3>

                          <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
                            {product.description}
                          </p>

                          {/* View Details Button */}
                          <Button
                            variant="outline"
                            disabled={product.status === 'comingSoon'}
                            className="w-full rounded-xl border-2 border-border text-secondary-foreground font-medium text-sm hover:bg-primary hover:border-primary hover:text-white hover:scale-102 hover:shadow-lg transition-all duration-300 py-3 group-hover:shadow-md"
                          >
                            {t('collection.viewDetails')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

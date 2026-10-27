# 🏥 Evolução Médica UTI - Sistema SOAP

Sistema inteligente para organização de evoluções médicas em Unidade de Terapia Intensiva (UTI), utilizando o formato SOAP adaptado para contexto de terapia intensiva.

## 📋 Sobre o Projeto

Este aplicativo foi desenvolvido para auxiliar médicos intensivistas na organização e padronização de evoluções clínicas, transformando anotações brutas em documentos estruturados e profissionais.

### ✨ Funcionalidades Principais

- **Extração Inteligente**: Reconhece automaticamente informações clínicas de textos não estruturados
- **Classificação por Sistemas**: Organiza dados em categorias clínicas
- **Conciliação Temporal**: Integra informações de evolução anterior com exame atual
- **Detecção de Conflitos**: Identifica inconsistências entre dados históricos e atuais
- **Geração SOAP**: Produz documento formatado no padrão SOAP para UTI
- **Suporte a CID**: Permite associação de códigos CID aos diagnósticos
- **Auditoria Integrada**: Sistema de validação e alertas para revisão médica

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ (recomendado v20+)
- npm ou yarn

### Passos

```bash
git clone https://github.com/SandroDainez/app-soap-uti.git
cd app-soap-uti
npm install
npm run dev

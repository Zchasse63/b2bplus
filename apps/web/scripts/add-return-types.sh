#!/bin/bash

# Script to add return type annotations to API route handlers
# This fixes TypeScript strict mode compliance

set -e

echo "Adding return type annotations to API route handlers..."

# Find all route.ts files in app/api directory
find /home/user/b2bplus/apps/web/app/api -type f -name "route.ts" | while read file; do
  echo "Processing: $file"

  # Add Promise<NextResponse> return type to GET handlers
  sed -i 's/export async function GET(request: NextRequest) {/export async function GET(request: NextRequest): Promise<NextResponse> {/g' "$file"
  sed -i 's/export async function GET(request: Request) {/export async function GET(request: Request): Promise<NextResponse> {/g' "$file"

  # Add Promise<NextResponse> return type to POST handlers
  sed -i 's/export async function POST(request: NextRequest) {/export async function POST(request: NextRequest): Promise<NextResponse> {/g' "$file"
  sed -i 's/export async function POST(request: Request) {/export async function POST(request: Request): Promise<NextResponse> {/g' "$file"

  # Add Promise<NextResponse> return type to PUT handlers
  sed -i 's/export async function PUT(request: NextRequest) {/export async function PUT(request: NextRequest): Promise<NextResponse> {/g' "$file"
  sed -i 's/export async function PUT(request: Request) {/export async function PUT(request: Request): Promise<NextResponse> {/g' "$file"

  # Add Promise<NextResponse> return type to PATCH handlers
  sed -i 's/export async function PATCH(request: NextRequest) {/export async function PATCH(request: NextRequest): Promise<NextResponse> {/g' "$file"
  sed -i 's/export async function PATCH(request: Request) {/export async function PATCH(request: Request): Promise<NextResponse> {/g' "$file"

  # Add Promise<NextResponse> return type to DELETE handlers
  sed -i 's/export async function DELETE(request: NextRequest) {/export async function DELETE(request: NextRequest): Promise<NextResponse> {/g' "$file"
  sed -i 's/export async function DELETE(request: Request) {/export async function DELETE(request: Request): Promise<NextResponse> {/g' "$file"
done

echo "✓ Return type annotations added successfully!"

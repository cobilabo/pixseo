/**
 * ブロックビルダー用の型定義
 */

// ブロックの基本タイプ
export type BlockType = 
  | 'form'      // フォーム埋め込み
  | 'html'      // カスタムHTML
  | 'spacer'    // 空白
  | 'content'   // セクションブロック（統合ブロック）
  | 'article';  // 記事リンクブロック

// CTAボタンの設定
export interface CTAButtonConfig {
  type?: 'text' | 'image';  // ボタンタイプ（デフォルト: 'text'）
  url: string;              // リンク先URL
  openInNewTab?: boolean;   // 新しいタブで開く
  // テキストボタン用
  text?: string;            // ボタンテキスト
  text_ja?: string;         // ボタンテキスト（日本語）
  text_en?: string;         // ボタンテキスト（英語）
  text_zh?: string;         // ボタンテキスト（中国語）
  text_ko?: string;         // ボタンテキスト（韓国語）
  buttonColor?: string;     // ボタンカラー
  fontSize?: number;        // フォントサイズ（rem）
  fontWeight?: 'normal' | 'bold';
  textColor?: string;       // ボタンテキストカラー
  // 画像ボタン用
  imageUrl?: string;        // 画像URL
  imageAlt?: string;        // 画像alt属性
  imageWidth?: number;      // 画像幅（px）※空欄可
  imageHeight?: number;     // 画像高さ（px）※空欄可
}

// セクションブロックの設定（統合ブロック）
export interface ContentBlockConfig {
  // セクションID（ページ内リンク用）
  sectionId?: string;
  
  // 各要素の表示/非表示フラグ（デフォルト: false）
  showImage?: boolean;      // 画像を表示
  showHeading?: boolean;    // 見出しを表示
  showText?: boolean;       // テキストを表示
  showWriters?: boolean;    // ライターを表示
  showButtons?: boolean;    // ボタンを表示
  
  // 画像設定
  imageUrl?: string;        // 画像URL
  imageAlt?: string;        // 画像alt
  imagePosition?: 'left' | 'right' | 'background' | 'center-size-based';  // 画像の位置
  imageHeight?: number;     // 画像の高さ（px）
  imageWidth?: number;      // 画像の幅（px）※ center-size-based用
  filterType?: 'none' | 'full' | 'top' | 'bottom' | 'top-bottom' | 'all-direction';
  filterColor?: string;
  filterOpacity?: number;
  
  // 見出し設定
  heading?: string;
  heading_ja?: string;
  heading_en?: string;
  heading_zh?: string;
  heading_ko?: string;
  headingFontSize?: number;
  headingFontWeight?: 'normal' | 'bold';
  headingTextColor?: string;
  headingAlignment?: 'left' | 'center' | 'right';  // 配置
  
  // テキスト設定
  description?: string;
  description_ja?: string;
  description_en?: string;
  description_zh?: string;
  description_ko?: string;
  textFontSize?: number;
  textFontWeight?: 'normal' | 'bold';
  textColor?: string;
  textAlignment?: 'left' | 'center' | 'right';  // 配置
  
  // ライター設定
  writers?: Array<{ 
    writerId: string; 
    jobTitle?: string;
    jobTitle_ja?: string;
    jobTitle_en?: string;
    jobTitle_zh?: string;
    jobTitle_ko?: string;
  }>;
  writerLayout?: 'horizontal' | 'vertical';
  writerNameColor?: string;
  jobTitleColor?: string;
  buttonTextColor?: string;
  buttonBackgroundColor?: string;
  buttonBorderColor?: string;
  buttonText?: string;
  buttonText_ja?: string;
  buttonText_en?: string;
  buttonText_zh?: string;
  buttonText_ko?: string;
  
  // ボタン設定
  buttons?: Array<CTAButtonConfig>;
  buttonLayout?: 'horizontal' | '2x2' | 'vertical';
}

// フォームブロックの設定
export interface FormBlockConfig {
  formId: string;           // 選択したフォームのID
  showTitle?: boolean;      // フォームタイトルを表示するか
}

// HTMLブロックの設定
export interface HTMLBlockConfig {
  html: string;             // カスタムHTML
}

// 空白ブロックの設定
export interface SpacerBlockConfig {
  height: number;  // 高さ（px）
}

// 記事ブロックの設定
export interface ArticleBlockConfig {
  articleId: string;         // 選択した記事のID
  articleSlug?: string;      // 記事のスラッグ（表示用）
  articleTitle?: string;     // 記事のタイトル（プレビュー用）
  displayStyle: 'text' | 'blogcard';  // 表示形式（テキストリンク or ブログカード）
}

// ブロックの共通インターフェース
export interface Block {
  id: string;
  type: BlockType;
  order: number;
  config: FormBlockConfig | HTMLBlockConfig | SpacerBlockConfig | ContentBlockConfig | ArticleBlockConfig;
  
  // 余白設定（共通）
  spacing?: {
    paddingTop?: number;    // 上余白（px）
    paddingBottom?: number; // 下余白（px）
  };
  
  // レスポンシブ設定（将来の拡張用）
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  mobileOrder?: number;
}

// フォームフィールドのタイプ
export type FormFieldType =
  | 'text'              // テキスト入力
  | 'textarea'          // テキストエリア
  | 'email'             // メールアドレス
  | 'tel'               // 電話番号
  | 'number'            // 数値
  | 'name'              // 姓名（姓・名を分離）
  | 'address'           // 住所（郵便番号・都道府県・市区町村・番地）
  | 'select'            // 単一プルダウン
  | 'cascade'           // カスケード（連動プルダウン）
  | 'radio'             // ラジオボタン
  | 'checkbox'          // チェックボックス
  | 'agreement'         // 同意確認
  | 'display-text'      // テキスト表示
  | 'display-image'     // 画像表示
  | 'display-html';     // HTML表示

// フォームフィールドの共通設定
export interface FormFieldBase {
  id: string;
  type: FormFieldType;
  order: number;
  label?: string;           // フィールドのラベル
  placeholder?: string;     // プレースホルダー
  required?: boolean;       // 必須入力
  helpText?: string;        // ヘルプテキスト
}

// テキスト系フィールド
export interface TextFormField extends FormFieldBase {
  type: 'text' | 'textarea' | 'email' | 'tel' | 'number';
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;         // 正規表現パターン
}

// 姓名フィールド
export interface NameFormField extends FormFieldBase {
  type: 'name';
  showLastNameFirst?: boolean;  // 姓を先に表示
}

// 住所フィールド
export interface AddressFormField extends FormFieldBase {
  type: 'address';
  includePostalCode?: boolean;
  includeBuilding?: boolean;    // 建物名を含む
}

// 選択系フィールド
export interface SelectFormField extends FormFieldBase {
  type: 'select' | 'radio' | 'checkbox';
  options: Array<{
    value: string;
    label: string;
  }>;
  defaultValue?: string | string[];
}

// カスケードフィールド
export interface CascadeFormField extends FormFieldBase {
  type: 'cascade';
  cascadeType: 'prefecture-city';  // 都道府県→市区町村
  // 将来的に他のカスケードタイプを追加可能
}

// 同意確認フィールド
export interface AgreementFormField extends FormFieldBase {
  type: 'agreement';
  agreementText: string;    // 同意文（例: プライバシーポリシーに同意する）
  linkUrl?: string;         // リンク先URL
}

// 表示系フィールド
export interface DisplayFormField extends FormFieldBase {
  type: 'display-text' | 'display-image' | 'display-html';
  content: string;          // テキスト、画像URL、またはHTML
  alignment?: 'left' | 'center' | 'right';
}

// すべてのフォームフィールドタイプのユニオン型
export type FormField =
  | TextFormField
  | NameFormField
  | AddressFormField
  | SelectFormField
  | CascadeFormField
  | AgreementFormField
  | DisplayFormField;

// フォームの定義
export interface Form {
  id: string;
  mediaId: string;
  name: string;             // フォーム名（管理用）
  description?: string;     // フォームの説明
  fields: FormField[];      // フォームフィールドの配列
  
  // 送信設定
  submitButtonText?: string;    // 送信ボタンのテキスト
  successMessage?: string;      // 送信完了メッセージ
  errorMessage?: string;        // エラーメッセージ
  redirectUrl?: string;         // 送信後のリダイレクト先
  
  // 通知設定（将来の拡張用）
  notificationEmail?: string;   // 通知先メールアドレス
  
  createdAt: Date;
  updatedAt: Date;
}

// フォーム送信データ
export interface FormSubmission {
  id: string;
  formId: string;
  mediaId: string;
  data: Record<string, any>;    // フィールドID: 値
  submittedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}


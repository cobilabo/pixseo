/**
 * ブロックビルダー用の型定義
 */

// ブロックの基本タイプ
export type BlockType = 
  | 'text'      // テキスト表示
  | 'image'     // 画像表示
  | 'cta'       // CTA（コールトゥアクション）
  | 'form'      // フォーム埋め込み
  | 'html'      // カスタムHTML
  | 'heading'   // 見出し（H2）
  | 'imageText' // 画像&テキスト（2カラム）
  | 'writer';   // ライター表示

// テキストブロックの設定
export interface TextBlockConfig {
  content: string;           // HTML形式のテキスト
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'medium' | 'large';
  fontWeight?: 'normal' | 'bold';
  textColor?: string;        // テキストカラー
}

// 画像ブロックの設定
export interface ImageBlockConfig {
  imageUrl: string;
  alt: string;
  caption?: string;
  width?: number;           // %指定
  alignment?: 'left' | 'center' | 'right';
  link?: string;            // クリック時のリンク先
  imageHeight?: number;     // 画像の高さ（px）、未指定なら100%（auto）
  filterType?: 'none' | 'full' | 'top' | 'bottom' | 'top-bottom';  // フィルタータイプ
  filterColor?: string;     // フィルターカラー（例: #000000）
  filterOpacity?: number;   // フィルター透明度（0-100）
}

// CTAブロックの設定
export interface CTABlockConfig {
  imageUrl?: string;        // 背景画像URL
  imageAlt?: string;        // 画像alt
  imagePosition?: 'left' | 'right' | 'background';  // 画像の位置
  imageHeight?: number;     // 画像の高さ（px）、未指定なら100%（auto）
  filterType?: 'none' | 'full' | 'top' | 'bottom' | 'top-bottom';  // フィルタータイプ
  filterColor?: string;     // フィルターカラー（例: #000000）
  filterOpacity?: number;   // フィルター透明度（0-100）
  heading?: string;         // 見出し
  headingFontSize?: 'small' | 'medium' | 'large';
  headingFontWeight?: 'normal' | 'bold';
  headingTextColor?: string;
  description?: string;     // 説明文
  textFontSize?: 'small' | 'medium' | 'large';
  textFontWeight?: 'normal' | 'bold';
  textColor?: string;
  // ボタン設定（最大4つ）
  buttons: Array<{
    text: string;           // ボタンテキスト
    url: string;            // リンク先URL
    buttonColor?: string;   // ボタンカラー
    fontSize?: 'small' | 'medium' | 'large';
    fontWeight?: 'normal' | 'bold';
    textColor?: string;     // ボタンテキストカラー
    openInNewTab?: boolean;
  }>;
  buttonLayout?: 'horizontal' | '2x2' | 'vertical';  // ボタン配置
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

// 見出しブロックの設定
export interface HeadingBlockConfig {
  content: string;          // 見出しテキスト
  id?: string;              // ページ内リンク用のID
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'medium' | 'large';
  fontWeight?: 'normal' | 'bold';
  textColor?: string;       // テキストカラー
}

// 画像&テキストブロックの設定
export interface ImageTextBlockConfig {
  imageUrl: string;
  imageAlt: string;
  imagePosition: 'left' | 'right' | 'background';  // 画像の位置
  imageHeight?: number;     // 画像の高さ（px）、未指定なら100%（auto）
  filterType?: 'none' | 'full' | 'top' | 'bottom' | 'top-bottom';  // フィルタータイプ
  filterColor?: string;     // フィルターカラー（例: #000000）
  filterOpacity?: number;   // フィルター透明度（0-100）
  heading: string;                  // 見出し
  headingFontSize?: 'small' | 'medium' | 'large';
  headingFontWeight?: 'normal' | 'bold';
  headingTextColor?: string;
  text: string;                     // テキスト
  textFontSize?: 'small' | 'medium' | 'large';
  textFontWeight?: 'normal' | 'bold';
  textColor?: string;
}

// ライターブロックの設定
export interface WriterBlockConfig {
  layout: 'vertical' | 'horizontal';  // 縦並び or 横並び
  writers: Array<{
    writerId: string;  // ライターID
    jobTitle: string;  // 肩書き
  }>;
  // 共通スタイル設定
  writerNameColor?: string;       // ライター名の色
  jobTitleColor?: string;         // 肩書きテキストの色
  buttonText?: string;            // ボタンテキスト（デフォルト: VIEW MORE）
  buttonTextColor?: string;       // ボタンテキストの色
  buttonBackgroundColor?: string; // ボタン背景の色
  buttonBorderColor?: string;     // ボタン枠線の色
}

// ブロックの共通インターフェース
export interface Block {
  id: string;
  type: BlockType;
  order: number;
  config: TextBlockConfig | ImageBlockConfig | CTABlockConfig | FormBlockConfig | HTMLBlockConfig | HeadingBlockConfig | ImageTextBlockConfig | WriterBlockConfig;
  
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

